"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { decodeInput } from "@/lib/share/encoder";
import { useHousingStore, DEFAULT_INPUT } from "@/store/housingStore";
import { useToastStore } from "@/store/toastStore";

const BACKUP_NAME = "共有リンクを開く前の入力";

export function SharedView({ token }: { token: string }) {
  const router = useRouter();
  const hydrate = useHousingStore((s) => s.hydrateFromInput);
  const calculate = useHousingStore((s) => s.calculate);

  useEffect(() => {
    const showToast = useToastStore.getState().show;
    const input = decodeInput(token);
    if (!input) {
      // SHIG 55: tell the user why nothing was loaded
      showToast({
        tone: "error",
        message: "共有リンクを読み込めませんでした。リンクが途中で切れている可能性があります。",
      });
      router.replace("/simulator");
      return;
    }
    // SHIG 38 / 54: keep the receiver's own input before overwriting it, and offer undo
    const store = useHousingStore.getState();
    const current = JSON.stringify(store.input);
    const touched = current !== JSON.stringify(DEFAULT_INPUT) && current !== JSON.stringify(input);
    const backup = touched ? store.saveCurrent(BACKUP_NAME) : undefined;
    hydrate(input);
    calculate();
    if (backup) {
      showToast({
        message: `共有リンクの入力を読み込みました。それまでの入力は「保存済み」に「${BACKUP_NAME}」として残しています。`,
        actionLabel: "元に戻す",
        onAction: () => useHousingStore.getState().loadSaved(backup.id),
      });
    }
    router.replace("/simulator");
  }, [token, hydrate, calculate, router]);

  return (
    <div className="max-w-[600px] mx-auto px-5 py-20 text-center">
      <h1 className="text-xl font-semibold">共有された入力を読み込んでいます...</h1>
      <p className="mt-3 text-sm text-muted-foreground">自動的にシミュレーターへ移動します。</p>
    </div>
  );
}
