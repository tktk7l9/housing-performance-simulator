"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { decodeInput } from "@/lib/share/encoder";
import { useHousingStore } from "@/store/housingStore";

export function SharedView({ token }: { token: string }) {
  const router = useRouter();
  const hydrate = useHousingStore((s) => s.hydrateFromInput);
  const calculate = useHousingStore((s) => s.calculate);

  useEffect(() => {
    const input = decodeInput(token);
    if (!input) {
      router.replace("/simulator");
      return;
    }
    hydrate(input);
    calculate();
    router.replace("/simulator");
  }, [token, hydrate, calculate, router]);

  return (
    <div className="max-w-[600px] mx-auto px-5 py-20 text-center">
      <h1 className="text-xl font-semibold">共有された入力を読み込んでいます...</h1>
      <p className="mt-3 text-sm text-muted-foreground">自動的にシミュレーターへ移動します。</p>
    </div>
  );
}
