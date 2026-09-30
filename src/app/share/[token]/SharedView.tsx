"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { decodeInput } from "@/lib/share/encoder";
import { useHousingStore, DEFAULT_INPUT, SAVED_LIMIT } from "@/store/housingStore";
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
    // SHIG 38 / 54: keep the receiver's own input before overwriting it, and offer undo.
    // Undo restores an in-memory snapshot, so it works even when the saved list is full.
    const store = useHousingStore.getState();
    const current = JSON.stringify(store.input);
    const touched = current !== JSON.stringify(DEFAULT_INPUT) && current !== JSON.stringify(input);
    const snapshot = touched
      ? {
          input: store.input,
          selectedScenarioIds: [...store.selectedScenarioIds],
          currentStep: store.currentStep,
          visitedSteps: new Set(store.visitedSteps),
        }
      : undefined;
    // Only keep a durable copy when there is room: saveCurrent drops the oldest entry
    // at the limit, and a backup must never cost the user another saved simulation.
    const backup =
      touched && store.savedSimulations.length < SAVED_LIMIT ? store.saveCurrent(BACKUP_NAME) : undefined;
    hydrate(input);
    calculate();
    if (snapshot) {
      showToast({
        message: backup
          ? `共有リンクの入力を読み込みました。それまでの入力は「保存済み」に「${BACKUP_NAME}」として残しています。`
          : "共有リンクの入力を読み込みました。それまでの入力に戻すには「元に戻す」を押してください。",
        actionLabel: "元に戻す",
        onAction: () => useHousingStore.setState({ ...snapshot, result: null }),
      });
    }
    router.replace("/simulator");
  }, [token, hydrate, calculate, router]);

  return (
    // The root layout's skip link points at #main, so every page needs that landmark
    <main id="main" className="max-w-[600px] mx-auto px-5 py-20 text-center">
      <h1 className="text-xl font-semibold">共有された入力を読み込んでいます...</h1>
      <p className="mt-3 text-sm text-muted-foreground">自動的にシミュレーターへ移動します。</p>
    </main>
  );
}
