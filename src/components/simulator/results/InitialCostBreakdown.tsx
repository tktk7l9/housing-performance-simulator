"use client";

import { calcInitialCost } from "@/lib/housing/cost";
import { formatManYen } from "@/lib/utils";
import type { SimulationOutput } from "@/lib/housing/types";

export function InitialCostBreakdown({ output }: { output: SimulationOutput }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr className="text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-4">項目</th>
            {output.scenarios.map((s) => (
              <th key={s.scenarioId} className="py-2 px-2 text-right whitespace-nowrap">{s.scenarioName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["insulation", "renovation", "solar", "battery", "waterHeater", "heating", "hems"] as const).map((key) => (
            <tr key={key} className="border-b last:border-b-0">
              <td className="py-2 pr-4 text-muted-foreground">{LABELS[key]}</td>
              {output.scenarios.map((s) => {
                const breakdown = calcInitialCost(
                  s.scenarioId === output.baselineId
                    ? findScenarioInput(output, output.baselineId)
                    : findScenarioInput(output, s.scenarioId)
                );
                return (
                  <td key={s.scenarioId} className="py-2 px-2 text-right font-mono">
                    {breakdown[key] > 0 ? formatManYen(breakdown[key]) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 pr-4">補助金（控除）</td>
            {output.scenarios.map((s) => (
              <td key={s.scenarioId} className="py-2 px-2 text-right font-mono text-green-700">
                {s.subsidyTotal > 0 ? `-${formatManYen(s.subsidyTotal)}` : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t-2">
            <td className="py-2 pr-4 font-semibold">合計（補助後）</td>
            {output.scenarios.map((s) => (
              <td key={s.scenarioId} className="py-2 px-2 text-right font-mono font-semibold">
                {formatManYen(s.initialCostNet)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
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

// シナリオの input は output には直接保持されないため、scenarioId から再構築する代わりに
// presets を再ビルドして lookup する。
import { buildAllScenarios } from "@/lib/housing/presets";
import type { HousingInput } from "@/lib/housing/types";

function findScenarioInput(output: SimulationOutput, scenarioId: string): HousingInput {
  const all = buildAllScenarios(output.inputAtCalc);
  const found = all.find((s) => s.id === scenarioId);
  return found?.input ?? output.inputAtCalc;
}
