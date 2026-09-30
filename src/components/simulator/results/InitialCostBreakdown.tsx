"use client";

import { calcInitialCost } from "@/lib/housing/cost";
import { formatManYen } from "@/lib/utils";
import type { SimulationOutput } from "@/lib/housing/types";

const ROW_KEYS = ["insulation", "renovation", "solar", "battery", "waterHeater", "heating", "hems"] as const;

export function InitialCostBreakdown({ output }: { output: SimulationOutput }) {
  const breakdowns = output.scenarios.map((s) => calcInitialCost(findScenarioInput(output, s.scenarioId)));
  // SHIG 1: drop rows that are zero for every scenario (e.g. renovation work in new-build mode)
  const rows = ROW_KEYS.filter((key) => breakdowns.some((b) => b[key] > 0));
  // SHIG 85 / 95 / 52: sticky, non-wrapping label column; the table scrolls sideways when narrow
  const labelCell = "sticky left-0 z-10 bg-card py-2 pr-4 whitespace-nowrap";
  return (
    <div className="flex flex-col gap-2">
    <p className="text-xs text-muted-foreground md:hidden">表は横にスクロールできます →</p>
    {/* Keyboard users can focus the scroll container and move it with the arrow keys */}
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="初期費用の内訳（表）">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b text-left">
          <tr className="text-xs uppercase tracking-wider text-muted-foreground">
            <th className={labelCell}>項目</th>
            {output.scenarios.map((s) => (
              <th key={s.scenarioId} className="py-2 px-2 text-right whitespace-nowrap">{s.scenarioName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => (
            <tr key={key} className="border-b last:border-b-0">
              <td className={`${labelCell} text-muted-foreground`}>{LABELS[key]}</td>
              {output.scenarios.map((s, i) => {
                const breakdown = breakdowns[i];
                return (
                  <td key={s.scenarioId} className="py-2 px-2 text-right font-mono">
                    {breakdown[key] > 0 ? formatManYen(breakdown[key]) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="font-semibold">
            <td className={labelCell}>補助金（控除）</td>
            {output.scenarios.map((s) => (
              <td key={s.scenarioId} className="py-2 px-2 text-right font-mono text-green-700">
                {s.subsidyTotal > 0 ? `-${formatManYen(s.subsidyTotal)}` : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t-2">
            <td className={`${labelCell} font-semibold`}>合計（補助後）</td>
            {output.scenarios.map((s) => (
              <td key={s.scenarioId} className="py-2 px-2 text-right font-mono font-semibold">
                {formatManYen(s.initialCostNet)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  insulation: "断熱グレード追加分",
  renovation: "リフォーム工事費",
  solar: "太陽光発電",
  battery: "蓄電池",
  waterHeater: "給湯機器",
  heating: "暖冷房設備",
  hems: "HEMS",
};

// The scenario input is not kept in the output directly, so instead of reconstructing it
// from scenarioId, rebuild the presets and look it up.
import { buildAllScenarios } from "@/lib/housing/presets";
import type { HousingInput } from "@/lib/housing/types";

function findScenarioInput(output: SimulationOutput, scenarioId: string): HousingInput {
  const all = buildAllScenarios(output.inputAtCalc);
  const found = all.find((s) => s.id === scenarioId);
  return found?.input ?? output.inputAtCalc;
}
