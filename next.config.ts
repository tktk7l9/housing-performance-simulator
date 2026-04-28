import type { NextConfig } from "next";

// Content-Security-Policy:
//   - default-src 'self' で全リソースを自オリジン限定
//   - script-src に 'unsafe-inline' / 'unsafe-eval' は Next.js（HMR・RSC）と
//     Recharts 等のクライアントライブラリで必要
//   - style-src 'unsafe-inline' は Tailwind v4 / Radix Portal が必要
//   - img-src は data: と blob: を許可（PDF サムネ・OG プレビュー用）
//   - frame-ancestors 'none' でクリックジャック防止（X-Frame-Options より厳格）
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
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
