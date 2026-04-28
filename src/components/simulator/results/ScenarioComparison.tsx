"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatManYen, formatYears, formatKg } from "@/lib/utils";
import type { SimulationOutput } from "@/lib/housing/types";
import { cn } from "@/lib/utils";

export function ScenarioComparison({ output }: { output: SimulationOutput }) {
  const baseline = output.scenarios.find((s) => s.scenarioId === output.baselineId)!;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {output.scenarios.map((s) => {
        const isBaseline = s.scenarioId === output.baselineId;
        const cumDelta = s.cumulativeTotal - baseline.cumulativeTotal;
        const isWin = cumDelta < 0;
        const payback = output.paybackYears[s.scenarioId];
        return (
          <Card
            key={s.scenarioId}
            className={cn(
              "p-4 flex flex-col gap-3",
              isBaseline ? "border-muted" : isWin ? "border-primary" : ""
            )}
          >
            <header className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold leading-tight" title={s.scenarioName}>
                {s.scenarioName}
              </h3>
              {isBaseline ? (
                <Badge variant="secondary" className="self-start">基準</Badge>
              ) : isWin ? (
                <Badge variant="success" className="self-start whitespace-nowrap">基準より得</Badge>
              ) : (
                <Badge variant="warning" className="self-start whitespace-nowrap">基準より高</Badge>
              )}
            </header>

            <Stat
              label={`${output.inputAtCalc.livingYears}年累計`}
              value={formatManYen(s.cumulativeTotal)}
              emphasis
            />
            {!isBaseline && (
              <Stat
                label="基準比 累計差"
                value={(cumDelta >= 0 ? "+" : "") + formatManYen(cumDelta)}
                variant={isWin ? "good" : "bad"}
              />
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-1">
              <Stat
                label="初期費用"
                hint="補助金控除後"
                value={formatManYen(s.initialCostNet)}
                size="sm"
              />
              <Stat
                label="初期差額"
                hint="標準との差"
                value={isBaseline ? "—" : (s.initialCostDelta >= 0 ? "+" : "") + formatManYen(s.initialCostDelta)}
                size="sm"
              />
              <Stat
                label="1年目 光熱費"
                value={formatManYen(s.firstYearEnergyCost)}
                size="sm"
              />
              <Stat
                label="投資回収"
                value={isBaseline ? "—" : Number.isFinite(payback) ? formatYears(payback) : "回収せず"}
                size="sm"
              />
              <Stat
                label="CO2 削減/年"
                value={isBaseline ? "—" : formatKg(s.annualCo2Reduction)}
                size="sm"
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasis,
  variant,
  size = "md",
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  variant?: "good" | "bad";
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      <span
        className={cn(
          "font-mono whitespace-nowrap tabular-nums",
          size === "md" ? "text-base" : "text-sm",
          emphasis && "text-lg font-semibold tracking-tight",
          variant === "good" && "text-green-700",
          variant === "bad" && "text-amber-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}
