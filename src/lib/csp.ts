// Source of truth for the static Content-Security-Policy. next.config.ts headers() serves it on
// every route the Next server answers.
//
//   - default-src 'self' restricts all resources to the same origin
//   - script-src has 'unsafe-inline' here because Next writes its RSC payload as inline
//     <script> (self.__next_f.push). In production every HTML response passes through
//     worker.ts, which swaps that token for a per-request nonce (src/lib/csp-nonce.ts), so
//     browsers never see 'unsafe-inline' in script-src on pages. Next 16's proxy/middleware (the
//     usual nonce source) runs only on the Node runtime, which OpenNext on Cloudflare Workers
//     cannot run. `next dev` / `next start` never reach the Worker and keep this static value.
//     'unsafe-eval' is only needed by the dev server (HMR / React Refresh), so production allows
//     just 'wasm-unsafe-eval' for the Yoga WebAssembly module that @react-pdf/renderer uses for
//     PDF export
//   - style-src 'unsafe-inline' is required by Tailwind v4 / Radix Portal
//   - img-src allows data: and blob: (for PDF thumbnails and OG previews)
//   - frame-ancestors 'none' prevents clickjacking (stricter than X-Frame-Options)
//
// Two origins are allowed for Cloudflare Web Analytics: the beacon script is loaded from
// static.cloudflareinsights.com and measurements are POSTed to cloudflareinsights.com. If either
// is missing the page still looks fine while only the beacon is silently blocked, so
// csp.test.ts pins both.
//
// 'strict-dynamic' is deliberately absent (csp.test.ts / csp-nonce.test.ts block it): it would
// make 'self' and the host source be ignored, so the chunks Next loads at runtime and the
// analytics beacon, which carry no nonce, would be blocked.
export const BEACON_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";
export const BEACON_REPORT_ORIGIN = "https://cloudflareinsights.com";

export function contentSecurityPolicy({ dev = false }: { dev?: boolean } = {}): string {
  const scriptEval = dev ? "'unsafe-eval'" : "'wasm-unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${scriptEval} ${BEACON_SCRIPT_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${BEACON_REPORT_ORIGIN}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
