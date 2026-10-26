import { applyBrowserCacheControl, applyScriptNonce } from "./csp-nonce";

export type FetchHandler = (request: Request, env: unknown, ctx: unknown) => Promise<Response>;

/**
 * Wraps the OpenNext worker (.open-next/worker.js) so every response (HTML, RSC payloads,
 * route handlers) gets the browser Cache-Control in place of Next's CDN-only `s-maxage`
 * (applyBrowserCacheControl), and every HTML response then leaves with a per-request script
 * nonce instead of script-src 'unsafe-inline' (applyScriptNonce). worker.ts applies it; it lives
 * here so tests can run it without an OpenNext build.
 */
export function withScriptNonceCsp(openNext: { fetch: FetchHandler }): { fetch: FetchHandler } {
  return {
    async fetch(request, env, ctx) {
      return applyScriptNonce(applyBrowserCacheControl(await openNext.fetch(request, env, ctx)));
    },
  };
}
