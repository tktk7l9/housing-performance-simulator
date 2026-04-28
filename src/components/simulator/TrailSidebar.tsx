"use client";

import { Check, Circle, Bookmark, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useHousingStore, getStepIds, type StepId } from "@/store/housingStore";
import { SavedList } from "./SavedList";

const STEP_LABELS: Record<StepId, string> = {
  building: "建物条件",
  performance: "住宅性能",
  equipment: "設備",
  economy: "経済条件",
  scenario: "比較シナリオ",
  results: "結果",
  renovation: "現状とリフォーム計画",
};

export function TrailSidebar() {
  const currentStep = useHousingStore((s) => s.currentStep);
  const visitedSteps = useHousingStore((s) => s.visitedSteps);
  const setStep = useHousingStore((s) => s.setStep);
  const input = useHousingStore((s) => s.input);
  const savedCount = useHousingStore((s) => s.savedSimulations.length);

  const [savedOpen, setSavedOpen] = useState(false);

  const stepIds = getStepIds(input.mode);

  const summaryFor = (id: StepId): string | null => {
    if (id === "building") {
      const region = input.addressPrefecture
        ? `${input.addressPrefecture}`
        : `${input.region}地域`;
      return `${input.floorArea}㎡ / ${region} / ${input.household}人`;
    }
    if (id === "performance") return `UA ${input.uaValue.toFixed(2)} / C ${input.cValue.toFixed(1)}`;
    if (id === "equipment") return `太陽光 ${input.solarCapacity}kW / 蓄電池 ${input.batteryCapacity}kWh`;
    if (id === "economy") return `電気 ${input.electricityPriceBuy}円/kWh`;
    if (id === "renovation") {
      const items = input.renovation?.items.length ?? 0;
      return `${input.renovation?.ageBracket ?? "—"} / ${items}項目`;
    }
    return null;
  };

  return (
    <nav className="flex flex-col gap-1.5 p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Steps</div>
      {stepIds.map((id, idx) => {
        const isCurrent = idx === currentStep;
        const isVisited = visitedSteps.has(idx);
        const summary = summaryFor(id);
        const hasSummarySlot = summary !== null && idx !== stepIds.length - 1;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setStep(idx)}
            className={cn(
              "text-left rounded-md px-3 py-2",
              isCurrent && "bg-accent text-accent-foreground",
              !isCurrent && "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              {isVisited ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{idx + 1}. {STEP_LABELS[id]}</span>
            </div>
            {hasSummarySlot && (
              <div
                className={cn(
                  "ml-6 mt-1 text-xs leading-tight tabular-nums truncate",
                  isVisited ? "text-muted-foreground" : "text-transparent select-none"
                )}
                aria-hidden={!isVisited}
              >
                {summary ?? " "}
              </div>
            )}
          </button>
        );
      })}

      <div className="mt-4 border-t pt-3">
        <button
          type="button"
          onClick={() => setSavedOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted text-sm"
          aria-expanded={savedOpen}
        >
          <span className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            <span>保存済み</span>
            {savedCount > 0 && (
              <span className="font-mono text-[10px] text-muted-foreground">({savedCount})</span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", savedOpen && "rotate-180")} />
        </button>
        {savedOpen && (
          <div className="mt-2">
            <SavedList />
          </div>
        )}
      </div>
    </nav>
  );
}
