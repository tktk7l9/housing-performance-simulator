import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "../csp";
import {
  applyBrowserCacheControl,
  applyScriptNonce,
  BROWSER_CACHE_CONTROL,
  browserCacheControl,
  CACHE_CONTROL_HEADER,
  createNonce,
  CSP_HEADER,
  isInlineJavaScript,
  type Rewriter,
  type ScriptElement,
  withScriptNonce,
} from "../csp-nonce";

const STATIC_CSP = contentSecurityPolicy();
/** What Next 16.4 on OpenNext sends on prerendered pages and their RSC payloads (seen live). */
const NEXT_PRERENDER_CACHE_CONTROL = "s-maxage=31536000";

/** Records the handler so tests can feed it fake <script> elements. */
function fakeRewriter() {
  const calls: { selector: string; handler: (el: ScriptElement) => void }[] = [];
  const transformed: Response[] = [];
  const rewriter: Rewriter = {
    on(selector, handlers) {
      calls.push({ selector, handler: handlers.element });
      return rewriter;
    },
    transform(response) {
      transformed.push(response);
      return response;
    },
  };
  return { rewriter: () => rewriter, calls, transformed };
}

/** A fake <script>. Names are lowercase, as HTMLRewriter reports them. */
function script(attrs: Record<string, string>) {
  return {
    attrs,
    getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
    hasAttribute: (name: string) => name in attrs,
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
  };
}

function html(headers: Record<string, string> = {}) {
  return new Response("<html><script>1</script></html>", {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: STATIC_CSP, ...headers },
  });
}

describe("createNonce", () => {
  it("returns 128 random bits as base64", () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(atob(createNonce())).toHaveLength(16);
  });

  it("never repeats across calls", () => {
    const nonces = new Set(Array.from({ length: 1000 }, () => createNonce()));
    expect(nonces.size).toBe(1000);
  });
});

describe("withScriptNonce", () => {
  it("replaces 'unsafe-inline' in script-src only, keeping 'self', wasm and the beacon host", () => {
    const out = withScriptNonce(STATIC_CSP, "abc");
    expect(out).toContain(
      "script-src 'self' 'nonce-abc' 'wasm-unsafe-eval' https://static.cloudflareinsights.com;",
    );
    // style-src keeps 'unsafe-inline' (React style attributes), which Observatory accepts.
    expect(out).toContain("style-src 'self' 'unsafe-inline';");
    expect(out).not.toMatch(/script-src[^;]*unsafe-inline/);
    // Only the script-src token changes; the rest of the policy is byte-identical.
    expect(out).toBe(STATIC_CSP.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'nonce-abc'"));
  });

  it("never adds 'strict-dynamic' (runtime-inserted scripts carry no nonce)", () => {
    expect(withScriptNonce(STATIC_CSP, "abc")).not.toContain("strict-dynamic");
  });

  it("handles script-src as the first directive", () => {
    expect(withScriptNonce("script-src 'unsafe-inline'; img-src 'self'", "n")).toBe(
      "script-src 'nonce-n'; img-src 'self'",
    );
  });

  it("returns null when there is nothing to tighten", () => {
    expect(withScriptNonce("default-src 'self'; script-src 'self'", "n")).toBeNull();
    expect(withScriptNonce("style-src 'unsafe-inline'", "n")).toBeNull();
  });
});

describe("isInlineJavaScript", () => {
  it.each<[string, Record<string, string>]>([
    ["no attributes (Next's own inline scripts)", {}],
    ["an empty type", { type: "" }],
    ["text/javascript", { type: "text/javascript" }],
    ["a JavaScript MIME type in any case", { type: "Application/JavaScript" }],
    ["a legacy JavaScript MIME type", { type: "text/x-ecmascript" }],
    ["a type wrapped in ASCII whitespace", { type: " text/javascript\n" }],
    ["type=module", { type: "module" }],
    ["type=MODULE", { type: "MODULE" }],
    ["an empty type that overrides language", { type: "", language: "vbscript" }],
    ["language=javascript without a type", { language: "JavaScript" }],
    ["an empty language without a type", { language: "" }],
    ["nomodule", { nomodule: "" }],
  ])("stamps %s", (_label, attrs) => {
    expect(isInlineJavaScript(script(attrs))).toBe(true);
  });

  it.each<[string, Record<string, string>]>([
    ["an external script", { src: "/_next/static/chunks/a.js" }],
    ["an empty src", { src: "" }],
    ["an external module", { type: "module", src: "/m.js" }],
    ["an SVG <script href> (SVG 2)", { href: "https://evil.example/x.js" }],
    ["an SVG <script xlink:href> (SVG 1.1)", { "xlink:href": "https://evil.example/x.js" }],
    ["application/ld+json (a data block)", { type: "application/ld+json" }],
    ["application/json", { type: "application/json" }],
    ["text/plain", { type: "text/plain" }],
    ["importmap", { type: "importmap" }],
    ["speculationrules", { type: "speculationrules" }],
    ["a JavaScript type with parameters (not an essence match)", { type: "text/javascript; charset=utf-8" }],
    ["a type wrapped in non-ASCII whitespace", { type: "\u00a0text/javascript" }],
    ["a type spelled with a character reference (arrives raw)", { type: "text&#47;javascript" }],
    ["language=vbscript without a type", { language: "vbscript" }],
  ])("does not stamp %s", (_label, attrs) => {
    expect(isInlineJavaScript(script(attrs))).toBe(false);
  });

  it("checks each JavaScript MIME type essence of the HTML spec", () => {
    const essences = [
      "application/ecmascript",
      "application/javascript",
      "application/x-ecmascript",
      "application/x-javascript",
      "text/ecmascript",
      "text/javascript",
      "text/javascript1.0",
      "text/javascript1.1",
      "text/javascript1.2",
      "text/javascript1.3",
      "text/javascript1.4",
      "text/javascript1.5",
      "text/jscript",
      "text/livescript",
      "text/x-ecmascript",
      "text/x-javascript",
    ];
    for (const type of essences) expect(isInlineJavaScript(script({ type })), type).toBe(true);
    expect(isInlineJavaScript(script({ type: "text/javascript1.6" }))).toBe(false);
  });
});

describe("applyScriptNonce", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("swaps the CSP for a nonce one and stamps every inline JavaScript script", () => {
    const fake = fakeRewriter();
    const out = applyScriptNonce(html({ etag: '"x"', "content-length": "31" }), {
      nonce: "N",
      rewriter: fake.rewriter,
    });

    expect(out.status).toBe(200);
    expect(out.statusText).toBe("OK");
    expect(out.headers.get(CSP_HEADER)).toBe(
      STATIC_CSP.replace("'self' 'unsafe-inline' 'wasm-unsafe-eval'", "'self' 'nonce-N' 'wasm-unsafe-eval'"),
    );
    expect(out.headers.get("etag")).toBeNull();
    expect(out.headers.get("content-length")).toBeNull();
    expect(out.headers.get("content-type")).toBe("text/html; charset=utf-8");

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].selector).toBe("script");
    // Next's RSC payload and bootstrap, a data block and external scripts.
    const rscPayload = script({});
    const bootstrap = script({ id: "_R_" });
    const typed = script({ type: "application/json" });
    const external = script({ src: "/_next/static/chunks/a.js" });
    const svgExternal = script({ href: "https://evil.example/x.js" });
    for (const el of [rscPayload, bootstrap, typed, external, svgExternal]) fake.calls[0].handler(el);
    expect(rscPayload.attrs.nonce).toBe("N");
    expect(bootstrap.attrs.nonce).toBe("N");
    // A data block never runs, so it needs no nonce.
    expect(typed.attrs.nonce).toBeUndefined();
    // External scripts are allowed by 'self' / the host source; a nonce would let any URL load.
    expect(external.attrs.nonce).toBeUndefined();
    expect(svgExternal.attrs.nonce).toBeUndefined();
  });

  it("keeps exactly one CSP header", () => {
    const out = applyScriptNonce(html(), { nonce: "N", rewriter: fakeRewriter().rewriter });
    expect(out.headers.get(CSP_HEADER)?.match(/default-src/g)).toHaveLength(1);
  });

  it("uses the same nonce in the header and on the scripts, and a fresh one per response", () => {
    const fake = fakeRewriter();
    const a = applyScriptNonce(html(), { rewriter: fake.rewriter });
    const b = applyScriptNonce(html(), { rewriter: fake.rewriter });
    const nonceOf = (r: Response) => r.headers.get(CSP_HEADER)?.match(/'nonce-([^']+)'/)?.[1];
    expect(nonceOf(a)).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonceOf(a)).not.toBe(nonceOf(b));

    const first = script({});
    fake.calls[0].handler(first);
    expect(first.attrs.nonce).toBe(nonceOf(a));
  });

  it.each([
    ["non-HTML", new Response("{}", { headers: { "content-type": "application/json", [CSP_HEADER]: STATIC_CSP } })],
    ["RSC payload", new Response("0:[]", { headers: { "content-type": "text/x-component", [CSP_HEADER]: STATIC_CSP } })],
    ["no content-type", new Response(new Uint8Array([120]), { headers: { [CSP_HEADER]: STATIC_CSP } })],
    ["no body", new Response(null, { status: 304, headers: { "content-type": "text/html" } })],
    ["no CSP", new Response("<p>", { headers: { "content-type": "text/html" } })],
    [
      "CSP without 'unsafe-inline'",
      new Response("<p>", { headers: { "content-type": "text/html", [CSP_HEADER]: "script-src 'self'" } }),
    ],
  ])("passes %s responses through untouched", (_label, response) => {
    const fake = fakeRewriter();
    expect(applyScriptNonce(response, { rewriter: fake.rewriter })).toBe(response);
    expect(fake.calls).toHaveLength(0);
  });

  it("matches the content type case-insensitively", () => {
    const fake = fakeRewriter();
    const upper = new Response("<p>", { headers: { "content-type": "Text/HTML", [CSP_HEADER]: STATIC_CSP } });
    expect(applyScriptNonce(upper, { nonce: "N", rewriter: fake.rewriter })).not.toBe(upper);
    expect(fake.calls).toHaveLength(1);
  });

  it("needs no options for responses it leaves alone", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(applyScriptNonce(json)).toBe(json);
  });

  it("uses the Workers HTMLRewriter by default", () => {
    const fake = fakeRewriter();
    vi.stubGlobal(
      "HTMLRewriter",
      class {
        constructor() {
          return fake.rewriter();
        }
      },
    );
    applyScriptNonce(html(), { nonce: "N" });
    expect(fake.transformed).toHaveLength(1);
  });

  it("fails loudly outside the Workers runtime instead of serving a nonce nobody stamped", () => {
    expect(() => applyScriptNonce(html(), { nonce: "N" })).toThrow(/HTMLRewriter/);
  });
});

describe("browserCacheControl", () => {
  it.each<[string, string]>([
    ["Next 16.4's prerender header (s-maxage alone)", NEXT_PRERENDER_CACHE_CONTROL],
    ["an older Next prerender header (s-maxage + stale-while-revalidate)", "s-maxage=31536000, stale-while-revalidate=2592000"],
    ["s-maxage after other directives", "public, max-age=0, s-maxage=31536000, must-revalidate"],
    ["s-maxage with no space after the comma", "public,s-maxage=60"],
    ["s-maxage in another case", "S-MaxAge=60"],
  ])("rewrites %s to what Vercel sends browsers", (_label, value) => {
    expect(browserCacheControl(value)).toBe("public, max-age=0, must-revalidate");
  });

  it.each<[string, string]>([
    ["Next's no-store header", "private, no-cache, no-store, max-age=0, must-revalidate"],
    ["the immutable /_next/static header", "public,max-age=31536000,immutable"],
    ["max-age without s-maxage", "public, max-age=3600, stale-while-revalidate=60"],
    ["a directive whose name only ends in s-maxage", "x-s-maxage=60"],
    ["the browser header itself", BROWSER_CACHE_CONTROL],
  ])("leaves %s unchanged", (_label, value) => {
    expect(browserCacheControl(value)).toBe(value);
  });

  it("leaves a missing header missing", () => {
    expect(browserCacheControl(null)).toBeNull();
  });
});

describe("applyBrowserCacheControl", () => {
  it("swaps only the Cache-Control of a response with Next's CDN header", async () => {
    const original = new Response("0:[]", {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "text/x-component",
        [CACHE_CONTROL_HEADER]: NEXT_PRERENDER_CACHE_CONTROL,
        [CSP_HEADER]: STATIC_CSP,
        etag: '"e"',
        vary: "RSC, Next-Router-State-Tree, Next-Router-Prefetch",
      },
    });

    const out = applyBrowserCacheControl(original);

    expect(out.status).toBe(200);
    expect(out.statusText).toBe("OK");
    expect(out.headers.get(CACHE_CONTROL_HEADER)).toBe(BROWSER_CACHE_CONTROL);
    expect(out.headers.get("content-type")).toBe("text/x-component");
    expect(out.headers.get(CSP_HEADER)).toBe(STATIC_CSP);
    expect(out.headers.get("etag")).toBe('"e"');
    expect(out.headers.get("vary")).toBe("RSC, Next-Router-State-Tree, Next-Router-Prefetch");
    expect(await out.text()).toBe("0:[]");
    // A copy, not an edit: responses from fetch() have immutable headers.
    expect(out).not.toBe(original);
    expect(original.headers.get(CACHE_CONTROL_HEADER)).toBe(NEXT_PRERENDER_CACHE_CONTROL);
  });

  it("keeps a bodiless 304 bodiless", () => {
    const out = applyBrowserCacheControl(
      new Response(null, { status: 304, headers: { [CACHE_CONTROL_HEADER]: NEXT_PRERENDER_CACHE_CONTROL } }),
    );
    expect(out.status).toBe(304);
    expect(out.body).toBeNull();
    expect(out.headers.get(CACHE_CONTROL_HEADER)).toBe(BROWSER_CACHE_CONTROL);
  });

  it("returns a response without Cache-Control as it is, without adding one", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(applyBrowserCacheControl(json)).toBe(json);
    expect(json.headers.has(CACHE_CONTROL_HEADER)).toBe(false);
  });

  it("returns a response whose Cache-Control needs no change as it is", () => {
    const immutable = new Response("", {
      headers: { "content-type": "text/javascript", [CACHE_CONTROL_HEADER]: "public,max-age=31536000,immutable" },
    });
    expect(applyBrowserCacheControl(immutable)).toBe(immutable);
  });
});
