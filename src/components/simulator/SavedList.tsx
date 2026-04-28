"use client";

import { Trash2, RotateCcw } from "lucide-react";
import { useHousingStore } from "@/store/housingStore";
import { formatManYen } from "@/lib/utils";

export function SavedList() {
  const saved = useHousingStore((s) => s.savedSimulations);
  const loadSaved = useHousingStore((s) => s.loadSaved);
  const deleteSaved = useHousingStore((s) => s.deleteSaved);
  const calculate = useHousingStore((s) => s.calculate);

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
          <div className="flex gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                loadSaved(s.id);
                // 復元後に自動で再計算
                setTimeout(calculate, 0);
              }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground hover:bg-secondary/80"
            >
              <RotateCcw className="h-3 w-3" /> 復元
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`「${s.name}」を削除しますか？`)) deleteSaved(s.id);
              }}
              aria-label="削除"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
