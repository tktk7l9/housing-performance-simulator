// Sensitivity analysis (tornado chart)
//
// Centered on the user's input, swing 6 key parameters to their low and high values
// and compute the difference in 30-year cumulative cost.
// Results are sorted by impact (|low - high|), largest first.

import type { ElectricityRiseScenario, HousingInput, ScenarioResult } from "./types";
import { runSimulation } from "./calculator";
import { buildRenovationAppliedScenario, buildUserScenario } from "./presets";

/** Return the "user scenario" to analyze for sensitivity, depending on the mode */
function targetScenario(input: HousingInput) {
  return input.mode === "renovation"
    ? buildRenovationAppliedScenario(input)
    : buildUserScenario(input);
}

const TARGET_ID_FOR_PICK = (mode: HousingInput["mode"]) =>
  mode === "renovation" ? "renovation-applied" : "user";

export interface SensitivityRow {
  /** Parameter identifier */
  key: SensitivityKey;
  /** Display label */
  label: string;
  /** Center value (human readable) */
  centerLabel: string;
  /** Display of the low / high ends */
  lowLabel: string;
  highLabel: string;
  /** Cumulative cost (yen) — center / low / high */
  centerCost: number;
  lowCost: number;
  highCost: number;
  /** Difference from center (yen) — for display */
  lowDelta: number;
  highDelta: number;
  /** Impact (|low - high|), yen */
  impact: number;
}

export type SensitivityKey =
  | "electricityPrice"
  | "electricityRise"
  | "solarCapacity"
  | "uaValue"
  | "sellPriceFit"
  | "livingYears";

interface ParamSpec {
  key: SensitivityKey;
  label: string;
  /** Get the center value */
  center: (i: HousingInput) => { value: number | string; label: string };
  /** Input transform for the low end */
  low: (i: HousingInput) => { input: HousingInput; label: string };
  /** Input transform for the high end */
  high: (i: HousingInput) => { input: HousingInput; label: string };
}

const RISE_VALUES: Record<ElectricityRiseScenario, { rate: number; label: string }> = {
  flat: { rate: 0, label: "横ばい" },
  moderate: { rate: 2, label: "+2%/年" },
  steep: { rate: 5, label: "+5%/年" },
};

const PARAMS: ParamSpec[] = [
  {
    key: "electricityPrice",
    label: "電気料金 単価",
    center: (i) => ({ value: i.electricityPriceBuy, label: `${i.electricityPriceBuy} 円/kWh` }),
    low: (i) => {
      const v = Math.max(5, Math.round(i.electricityPriceBuy * 0.7));
      return { input: { ...i, electricityPriceBuy: v }, label: `${v} 円/kWh (-30%)` };
    },
    high: (i) => {
      const v = Math.round(i.electricityPriceBuy * 1.3);
      return { input: { ...i, electricityPriceBuy: v }, label: `${v} 円/kWh (+30%)` };
    },
  },
  {
    key: "electricityRise",
    label: "電気代 上昇率",
    center: (i) => ({ value: i.electricityRise, label: RISE_VALUES[i.electricityRise].label }),
    low: (i) => ({ input: { ...i, electricityRise: "flat" }, label: "横ばい" }),
    high: (i) => ({ input: { ...i, electricityRise: "steep" }, label: "+5%/年" }),
  },
  {
    key: "solarCapacity",
    label: "太陽光 容量",
    center: (i) => ({ value: i.solarCapacity, label: `${i.solarCapacity} kW` }),
    low: (i) => {
      const v = Math.max(0, i.solarCapacity - 2);
      return { input: { ...i, solarCapacity: v }, label: `${v} kW` };
    },
    high: (i) => {
      const v = i.solarCapacity + 2;
      return { input: { ...i, solarCapacity: v }, label: `${v} kW` };
    },
  },
  {
    key: "uaValue",
    label: "UA 値（断熱）",
    center: (i) => ({ value: i.uaValue, label: i.uaValue.toFixed(2) }),
    low: (i) => {
      const v = Math.max(0.15, Number((i.uaValue - 0.15).toFixed(2)));
      return { input: { ...i, uaValue: v, insulationPreset: "custom" }, label: `${v.toFixed(2)} (改善)` };
    },
    high: (i) => {
      const v = Number((i.uaValue + 0.15).toFixed(2));
      return { input: { ...i, uaValue: v, insulationPreset: "custom" }, label: `${v.toFixed(2)} (悪化)` };
    },
  },
  {
    key: "sellPriceFit",
    label: "FIT 売電単価",
    center: (i) => ({ value: i.sellPriceFit, label: `${i.sellPriceFit} 円/kWh` }),
    low: (i) => {
      const v = Math.max(0, i.sellPriceFit - 5);
      return { input: { ...i, sellPriceFit: v }, label: `${v} 円/kWh` };
    },
    high: (i) => {
      const v = i.sellPriceFit + 5;
      return { input: { ...i, sellPriceFit: v }, label: `${v} 円/kWh` };
    },
  },
  {
    key: "livingYears",
    label: "想定居住年数",
    center: (i) => ({ value: i.livingYears, label: `${i.livingYears} 年` }),
    low: (i) => ({ input: { ...i, livingYears: 20 }, label: "20 年" }),
    high: (i) => ({ input: { ...i, livingYears: 40 }, label: "40 年" }),
  },
];

function userCumulative(input: HousingInput): number {
  const result = runSimulation(input, [targetScenario(input)]);
  const target = result.scenarios.find((s) => s.scenarioId === TARGET_ID_FOR_PICK(input.mode));
  return target ? target.cumulativeTotal : 0;
}

function pickResult(input: HousingInput): ScenarioResult | undefined {
  const result = runSimulation(input, [targetScenario(input)]);
  return result.scenarios.find((s) => s.scenarioId === TARGET_ID_FOR_PICK(input.mode));
}

export function runSensitivity(input: HousingInput): SensitivityRow[] {
  const center = userCumulative(input);
  const rows: SensitivityRow[] = PARAMS.map((p) => {
    const lo = p.low(input);
    const hi = p.high(input);
    const lowResult = pickResult(lo.input);
    const highResult = pickResult(hi.input);
    const lowCost = lowResult?.cumulativeTotal ?? center;
    const highCost = highResult?.cumulativeTotal ?? center;
    const c = p.center(input);
    return {
      key: p.key,
      label: p.label,
      centerLabel: c.label,
      lowLabel: lo.label,
      highLabel: hi.label,
      centerCost: center,
      lowCost,
      highCost,
      lowDelta: lowCost - center,
      highDelta: highCost - center,
      impact: Math.abs(lowCost - highCost),
    };
  });
  return rows.sort((a, b) => b.impact - a.impact);
}
