# Housing Performance Simulator

## Product stance

A tool that lets home buyers decide "which option pays off over 30 years" with **neutral numbers**.

- No sales pitch or recommendation language (steering words such as 「おすすめ」 (recommended) or 「最適」 (optimal) are forbidden)
- Do not show manufacturer or product names (handle equipment only by category and efficiency value)
- Always keep calculation assumptions and coefficients in `src/lib/housing/data/*.ts`, and keep them disclosable from the UI (AssumptionsPanel)
- The subsidy master must have a `lastUpdated` field

## Next.js 16 notes

This repository uses Next.js 16+. Its APIs, conventions and file layout may differ from the Next.js in your training data. Before writing new API code, always consult the relevant guide in `node_modules/next/dist/docs/`. Do not ignore deprecation warnings; fix them.

## Content-Security-Policy

- Static baseline: `src/lib/csp.ts` (explains every directive), served by `headers()` in `next.config.ts`. Its `script-src` keeps `'unsafe-inline'` only as the token the Worker replaces.
- Production nonce: `wrangler.jsonc` `main` is `worker.ts`, which wraps `.open-next/worker.js` (`src/lib/worker-entry.ts`). For every `text/html` response it swaps that `'unsafe-inline'` for a fresh 128-bit `'nonce-…'` and stamps the nonce on each inline `<script>` with HTMLRewriter (`src/lib/csp-nonce.ts`, streaming). The header is replaced, never appended: exactly one CSP per response. ETag / Content-Length are dropped because the body differs per request. Next 16's proxy/middleware (the usual nonce source) runs only on Node, which OpenNext on Workers cannot run.
- **Never point `main` back at `.open-next/worker.js`**: it silently restores `'unsafe-inline'` (`src/lib/__tests__/worker-entry.test.ts` guards it).
- **Never add `'strict-dynamic'`**: it makes `'self'` and host sources be ignored, which blocks the chunks Next loads at runtime and the analytics beacon, none of which carry a nonce.
- Inline scripts must be in the server-rendered HTML (that is where the nonce is stamped). Do not put HTML in `public/`: Workers Assets serve it before the Worker runs, without the nonce.
- Only inline JavaScript gets the nonce (`isInlineJavaScript`): `<script src>`, an SVG `<script href>` and data blocks such as `application/json` are left unstamped.
- **Trust boundary:** HTMLRewriter cannot tell Next's inline scripts from injected ones, so any inline `<script>` that reaches the server-rendered HTML gets the nonce. The nonce is safe only while the server never emits untrusted HTML. `src/lib/__tests__/trust-boundary.test.ts` enforces it: `dangerouslySetInnerHTML` is allowed only in the files on its allowlist, which is empty today. A new sink goes on that list with a reason and a hostile-input test, or it fails CI.
- Production allows `'wasm-unsafe-eval'` (Yoga wasm for the PDF export), never `'unsafe-eval'`. The Yoga loader tries `fetch()` on its inline `data:` URL before decoding it itself; `connect-src` has no `data:`, so the PDF export runs inside `withoutDataUrlFetch` (`src/lib/without-data-url-fetch.ts`), which refuses that fetch locally instead of letting the browser report a violation. Do not add `data:` to `connect-src`.
- Cloudflare Web Analytics: the beacon is appended after hydration (`src/components/Analytics.tsx`), not written as `<script src>` in the HTML (Observatory subresource-integrity). **Never add `integrity`**: Cloudflare updates `beacon.min.js` in place, so a pinned hash silently stops the beacon. The CSP keeps `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`.
- `next dev` / `next start` do not run the Worker and keep the static header (dev swaps in `'unsafe-eval'` for HMR).

## Calculation transparency

Implement each of the `heatLoad / hotWater / solar / battery / cost / subsidy / co2` modules as pure functions, and state the units of arguments and return values in comments. For coefficients that come from public sources (the energy-saving standard notice (省エネ基準告示), NEDO irradiance data, etc.), cite the source at the top of the data file.
