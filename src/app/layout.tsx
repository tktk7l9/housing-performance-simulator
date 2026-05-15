import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://housing-performance-simulator.vercel.app";

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
  // app/icon.svg, app/apple-icon.svg, app/opengraph-image.tsx は
  // Next.js のファイル規約により自動的にメタデータへ反映される。
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
        {children}
      </body>
    </html>
  );
}
