"use client";

import { Trash2, RotateCcw } from "lucide-react";
import { useHousingStore } from "@/store/housingStore";
import { formatManYen } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";

export function SavedList() {
  const saved = useHousingStore((s) => s.savedSimulations);
  const loadSaved = useHousingStore((s) => s.loadSaved);
  const deleteSaved = useHousingStore((s) => s.deleteSaved);
  const restoreSaved = useHousingStore((s) => s.restoreSaved);
  const showToast = useToastStore((s) => s.show);

  // SHIG 57 / 54: delete right away and offer undo instead of a confirm dialog
  const onDelete = (id: string, name: string, trigger: HTMLElement) => {
    // The button disappears with its row; hand focus to undo so keyboard users keep their place
    const hadFocus = document.activeElement === trigger;
    const removed = deleteSaved(id);
    if (!removed) return;
    showToast({
      message: `「${name}」を削除しました`,
      actionLabel: "元に戻す",
      onAction: () => restoreSaved(removed.entry, removed.index),
      focusAction: hadFocus,
    });
  };

  if (saved.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-3 py-2">
        保存済みなし。結果画面の「保存」から登録できます。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {saved.map((s) => (
        <li
          key={s.id}
          className="rounded-md border bg-background/60 px-2.5 py-2 text-xs flex flex-col gap-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium leading-tight line-clamp-2 break-all">{s.name}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {new Date(s.savedAt).toLocaleString("ja-JP", {
              year: "2-digit",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {s.input.mode === "renovation" ? " · リフォーム" : " · 新築"}
          </div>
          {s.summary && (
            <div className="font-mono text-[11px]">
              累計 {formatManYen(s.summary.cumulativeTotal)} / 初期 {formatManYen(s.summary.initialCostNet)}
            </div>
          )}
          {/* SHIG 16 / 78 / 13: 44px targets, delete kept apart from restore */}
          <div className="flex items-center gap-4 pt-0.5">
            <button
              type="button"
              onClick={() => loadSaved(s.id)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-md bg-secondary px-2 text-xs text-secondary-foreground hover:bg-secondary/80"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 復元
            </button>
            <button
              type="button"
              onClick={(e) => onDelete(s.id, s.name, e.currentTarget)}
              aria-label={`「${s.name}」を削除`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
