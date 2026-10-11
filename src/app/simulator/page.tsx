import type { Metadata } from "next";
import { SimulatorApp } from "@/components/simulator/SimulatorApp";

export const metadata: Metadata = {
  title: "シミュレーター",
  // Its own canonical (resolved against metadataBase), not the home page's.
  alternates: {
    canonical: "/simulator",
    languages: { ja: "/simulator" },
  },
};

export default function SimulatorPage() {
  return <SimulatorApp />;
}
