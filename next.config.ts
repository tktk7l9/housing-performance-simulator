import type { NextConfig } from "next";

// Content-Security-Policy:
//   - default-src 'self' restricts all resources to the same origin
//   - script-src needs 'unsafe-inline' / 'unsafe-eval' for Next.js (HMR, RSC) and
//     client libraries such as Recharts
//   - style-src 'unsafe-inline' is required by Tailwind v4 / Radix Portal
//   - img-src allows data: and blob: (for PDF thumbnails and OG previews)
//   - frame-ancestors 'none' prevents clickjacking (stricter than X-Frame-Options)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
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
