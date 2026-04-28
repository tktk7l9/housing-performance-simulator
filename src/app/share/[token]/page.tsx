import type { Metadata } from "next";
import { SharedView } from "./SharedView";

export const metadata: Metadata = {
  title: "共有された結果",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedView token={token} />;
}
