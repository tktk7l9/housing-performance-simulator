import type { Metadata } from "next";
import { SharedView } from "./SharedView";

export const metadata: Metadata = {
  title: "共有された結果",
  // Each token is someone's input that is loaded and then replaced by /simulator, so these URLs
  // are kept out of the index rather than given a canonical (noindex + canonical conflict).
  robots: { index: false, follow: true },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedView token={token} />;
}
