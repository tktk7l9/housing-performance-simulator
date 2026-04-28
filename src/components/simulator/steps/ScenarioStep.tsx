"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useHousingStore } from "@/store/housingStore";
import { buildAllScenarios } from "@/lib/housing/presets";
import { StepShell } from "../StepShell";

export function ScenarioStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const input = useHousingStore((s) => s.input);
  const selectedIds = useHousingStore((s) => s.selectedScenarioIds);
  const toggle = useHousingStore((s) => s.toggleScenario);
  const calculate = useHousingStore((s) => s.calculate);

  const scenarios = buildAllScenarios(input);

  const handleNext = () => {
    calculate();
    onNext();
  };

  return (
    <StepShell
      title="比較シナリオ"
      description="比較したい仕様パターンを選びます。標準仕様は基準として常に計算します。"
      onBack={onBack}
      onNext={handleNext}
      nextLabel="計算する"
    >
      <div className="grid grid-cols-1 gap-3">
        {scenarios.map((s) => {
          const isBaseline = s.id === "preset-baseline" || s.id === "renovation-as-is";
          const checked = isBaseline || selectedIds.includes(s.id);
          return (
            <Card key={s.id} className={checked ? "border-primary" : ""}>
              <CardContent className="p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={checked}
                    disabled={isBaseline}
                    onChange={() => !isBaseline && toggle(s.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{s.name} {isBaseline && <span className="ml-2 text-xs text-muted-foreground">（基準・固定）</span>}</div>
                    <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                  </div>
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </StepShell>
  );
}
