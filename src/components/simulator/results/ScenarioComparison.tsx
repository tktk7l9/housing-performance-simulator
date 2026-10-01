"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatManYen, formatYears, formatKg } from "@/lib/utils";
import type { ScenarioResult, SimulationOutput } from "@/lib/housing/types";
import { cn } from "@/lib/utils";

/** The scenario with the lowest cumulative total over the living years (first one wins a tie). */
export function cheapestScenario(output: SimulationOutput): ScenarioResult | undefined {
  return output.scenarios.reduce<ScenarioResult | undefined>(
    (min, s) => (!min || s.cumulativeTotal < min.cumulativeTotal ? s : min),
    undefined
  );
}

export function ScenarioComparison({ output }: { output: SimulationOutput }) {
  const baseline = output.scenarios.find((s) => s.scenarioId === output.baselineId)!;
  const cheapest = cheapestScenario(output);
  const years = output.inputAtCalc.livingYears;
  const cheapestDelta = cheapest && baseline ? cheapest.cumulativeTotal - baseline.cumulativeTotal : 0;
  return (
    <div className="flex flex-col gap-3">
      {/* SHIG 20 / 28: answer the major question in one line instead of making users scan every card */}
      {cheapest && (
        <p data-testid="cheapest-summary" className="rounded-md border bg-card px-4 py-3 text-sm leading-relaxed">
          {years}年累計が最も低いのは
          <strong className="mx-1 font-semibold">「{cheapest.scenarioName}」</strong>
          <span className="font-mono tabular-nums">{formatManYen(cheapest.cumulativeTotal)}</span>
          {cheapest.scenarioId !== output.baselineId && (
            <span className="text-muted-foreground">
              （基準比 {(cheapestDelta >= 0 ? "+" : "") + formatManYen(cheapestDelta)}）
            </span>
          )}
        </p>
      )}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {output.scenarios.map((s) => {
        const isBaseline = s.scenarioId === output.baselineId;
        const isCheapest = s.scenarioId === cheapest?.scenarioId;
        const cumDelta = s.cumulativeTotal - baseline.cumulativeTotal;
        const isWin = cumDelta < 0;
        const payback = output.paybackYears[s.scenarioId];
        return (
          <Card
            key={s.scenarioId}
            data-testid={`scenario-card-${s.scenarioId}`}
            className={cn(
              "p-4 flex flex-col gap-3",
              isBaseline ? "border-muted" : isWin ? "border-primary" : "",
              isCheapest && "border-2 border-primary"
            )}
          >
            <header className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold leading-tight" title={s.scenarioName}>
                {s.scenarioName}
              </h2>
              {isCheapest && (
                <Badge variant="default" className="self-start whitespace-nowrap">累計が最も低い</Badge>
              )}
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
              {!isBaseline && (
                <Stat
                  label="初期差額"
                  hint="標準との差"
                  value={(s.initialCostDelta >= 0 ? "+" : "") + formatManYen(s.initialCostDelta)}
                  size="sm"
                />
              )}
              <Stat
                label="1年目 光熱費"
                value={formatManYen(s.firstYearEnergyCost)}
                size="sm"
              />
              {/* SHIG 1: omit comparisons that do not apply to the baseline instead of showing dashes */}
              {!isBaseline && (
                <Stat
                  label="投資回収"
                  value={Number.isFinite(payback) ? formatYears(payback) : "回収せず"}
                  size="sm"
                />
              )}
              {!isBaseline && (
                <Stat
                  label="CO2 削減/年"
                  value={formatKg(s.annualCo2Reduction)}
                  size="sm"
                />
              )}
            </div>
          </Card>
        );
      })}
    </div>
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
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
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
