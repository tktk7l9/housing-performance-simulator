import type { Metadata, Viewport } from "next";
import "./globals.css";

// Migrated from Vercel to Cloudflare Workers on 2026-08-16. The whole Vercel account
// returns 402 after exceeding Fair Use, so keeping the old URL as canonical would make
// a dead page the canonical one.
// NEXT_PUBLIC_SITE_URL takes precedence when set (inlined at build time).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://housing-performance-simulator.saitotakuya0719.workers.dev";

const TITLE = "住宅性能シミュレーター";
const TAGLINE = "30年でどちらが得か、数字で確かめる。";
const DESCRIPTION =
  "断熱・気密・太陽光・蓄電池の選択を、初期費用と長期ランニングコストの両面から中立的に比較できる住宅性能シミュレーター。計算根拠を開示し、PDF・URL での共有にも対応。";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a8a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${TITLE} — ${TAGLINE}`,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: TITLE }],
  creator: TITLE,
  publisher: TITLE,
  category: "utilities",
  keywords: [
    "住宅性能",
    "住宅性能シミュレーター",
    "断熱",
    "気密",
    "UA値",
    "C値",
    "ZEH",
    "HEAT20",
    "G2",
    "G3",
    "太陽光発電",
    "蓄電池",
    "光熱費",
    "シミュレーション",
    "省エネ基準",
    "リフォーム",
    "投資回収",
  ],
  alternates: {
    canonical: "/",
    languages: {
      ja: "/",
    },
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: TITLE,
    title: `${TITLE} — ${TAGLINE}`,
    description:
      "断熱・気密・太陽光・蓄電池の選択を、初期費用と長期ランニングコストの両面から中立的に比較。",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${TAGLINE}`,
    description:
      "断熱・気密・太陽光・蓄電池の選択を、初期費用と長期ランニングコストの両面から中立的に比較。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: TITLE,
  },
  // app/icon.svg, app/apple-icon.tsx and app/opengraph-image.tsx are added to
  // the metadata automatically by Next.js file conventions.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className="antialiased"
    >
      <head>
        <link rel="preload" as="image" href="/hero-house.svg" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        {/* SHIG 59: keyboard users can jump past the header and step list straight to the content */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
        >
          本文へ移動
        </a>
        {children}
        {/* Cloudflare Web Analytics (the token is an identifier meant to be public, not a secret) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts --
            type="module" scripts are deferred by spec, so this does not block the parser */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={'{"token": "cd156fbf0fd24da0a12e58fdb4e63828"}'}
        />
      </body>
    </html>
  );
}
