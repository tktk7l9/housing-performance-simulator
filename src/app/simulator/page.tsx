import type { Metadata } from "next";
import { SimulatorApp } from "@/components/simulator/SimulatorApp";

export const metadata: Metadata = {
  title: "シミュレーター",
};

export default function SimulatorPage() {
  return <SimulatorApp />;
}
