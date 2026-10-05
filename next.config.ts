import type { NextConfig } from "next";

// Content-Security-Policy:
//   - default-src 'self' restricts all resources to the same origin
//   - script-src needs 'unsafe-inline' for Next.js inline bootstrap scripts.
//     'unsafe-eval' is only needed by the dev server (HMR / React Refresh), so
//     production allows just 'wasm-unsafe-eval' for the Yoga WebAssembly
//     module that @react-pdf/renderer uses for PDF export
//   - style-src 'unsafe-inline' is required by Tailwind v4 / Radix Portal
//   - img-src allows data: and blob: (for PDF thumbnails and OG previews)
//   - frame-ancestors 'none' prevents clickjacking (stricter than X-Frame-Options)
const isDev = process.env.NODE_ENV === "development";
const scriptEval = isDev ? "'unsafe-eval'" : "'wasm-unsafe-eval'";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${scriptEval} https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
