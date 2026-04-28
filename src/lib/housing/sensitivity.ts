// 感度分析（トルナド図）
//
// ユーザー入力を中心に、6 つの主要パラメータを下端値・上端値に振って
// 30 年累計コストの差分を計算する。
// 結果は影響度（|low - high|）の大きい順にソート。

import type { ElectricityRiseScenario, HousingInput, ScenarioResult } from "./types";
import { runSimulation } from "./calculator";
import { buildRenovationAppliedScenario, buildUserScenario } from "./presets";

/** モードに応じて、感度分析の対象とする「ユーザーシナリオ」を返す */
function targetScenario(input: HousingInput) {
  return input.mode === "renovation"
    ? buildRenovationAppliedScenario(input)
    : buildUserScenario(input);
}

const TARGET_ID_FOR_PICK = (mode: HousingInput["mode"]) =>
  mode === "renovation" ? "renovation-applied" : "user";

export interface SensitivityRow {
  /** パラメータ識別子 */
  key: SensitivityKey;
  /** 表示用ラベル */
  label: string;
  /** 中心値（人間可読） */
  centerLabel: string;
  /** 下端 / 上端の表示 */
  lowLabel: string;
  highLabel: string;
  /** 累計コスト（円）— 中心 / 下端 / 上端 */
  centerCost: number;
  lowCost: number;
  highCost: number;
  /** 中心からの差（円）— 表示用 */
  lowDelta: number;
  highDelta: number;
  /** 影響度（|low - high|）円 */
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
  /** 中心値の取得 */
  center: (i: HousingInput) => { value: number | string; label: string };
  /** 下端の入力変換 */
  low: (i: HousingInput) => { input: HousingInput; label: string };
  /** 上端の入力変換 */
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
