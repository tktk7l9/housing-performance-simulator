import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";

// Static CSP baseline (src/lib/csp.ts, which explains every directive). In production
// worker.ts replaces script-src 'unsafe-inline' with a per-request nonce on every HTML
// response (src/lib/csp-nonce.ts).
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev: isDev }) },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No window.open / cross-origin popups are used, so isolating the browsing context costs nothing.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
