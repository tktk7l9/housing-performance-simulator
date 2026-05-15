"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(
  () => import("./HeroScene").then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);

export function HeroSceneLazy({ className }: { className?: string }) {
  return <HeroScene className={className} />;
}
