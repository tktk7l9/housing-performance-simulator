// 比較プリセット
//   新築モード: 標準 / 高性能 / 高性能+太陽光+蓄電池 / ユーザー
//   リフォームモード: 現状維持 / リフォーム実施

import type { HousingInput, InsulationPresetId, RegionId, Scenario } from "./types";
import { INSULATION_PRESETS } from "./data/insulationPresets";
import { AGE_PRESETS, uaForAge } from "./data/agePresets";
import { RENOVATION_ITEMS } from "./data/renovationCosts";

function applyInsulation(input: HousingInput, presetId: InsulationPresetId): HousingInput {
  if (presetId === "custom") return input;
  const p = INSULATION_PRESETS[presetId];
  return {
    ...input,
    insulationPreset: presetId,
    uaValue: p.uaByRegion[input.region as RegionId],
    cValue: p.cValue,
  };
}

/** 標準: 省エネ基準・太陽光なし・蓄電池なし */
export function buildBaselineScenario(input: HousingInput): Scenario {
  const baseInput: HousingInput = {
    ...applyInsulation(input, "energy-saving"),
    windowSpec: "alum-resin-pair-lowe",
    solarCapacity: 0,
    batteryCapacity: 0,
    hems: false,
  };
  return {
    id: "preset-baseline",
    name: "標準仕様",
    description: "省エネ基準・太陽光/蓄電池なし。比較の基準点。",
    source: "preset",
    input: baseInput,
  };
}

/** 高性能: HEAT20 G2・樹脂サッシ・太陽光なし */
export function buildHighPerformanceScenario(input: HousingInput): Scenario {
  return {
    id: "preset-high-performance",
    name: "高性能（HEAT20 G2）",
    description: "断熱を G2 に強化。設備は省エネ基準と同等。",
    source: "preset",
    input: {
      ...applyInsulation(input, "heat20-g2"),
      windowSpec: "resin-pair-lowe",
      solarCapacity: 0,
      batteryCapacity: 0,
      hems: false,
    },
  };
}

/** 高性能 + 太陽光 + 蓄電池 */
export function buildHighPerformanceSolarBatteryScenario(input: HousingInput): Scenario {
  return {
    id: "preset-high-perf-solar-battery",
    name: "高性能 + 太陽光 + 蓄電池",
    description: "G2 断熱 + 太陽光 5kW + 蓄電池 7kWh。",
    source: "preset",
    input: {
      ...applyInsulation(input, "heat20-g2"),
      windowSpec: "resin-pair-lowe",
      solarCapacity: 5,
      solarOrientation: "south",
      solarTilt: 30,
      batteryCapacity: 7,
      hems: true,
    },
  };
}

/** ユーザー入力をシナリオ化（新築用） */
export function buildUserScenario(input: HousingInput): Scenario {
  return {
    id: "user",
    name: "あなたの仕様",
    description: "入力された条件のままシミュレーション。",
    source: "user",
    input,
  };
}

// ── リフォームモード ────────────────────────────────────────────

/** 現状維持: 既存性能のままで光熱費を払い続ける（追加投資0） */
export function buildRenovationAsIsScenario(input: HousingInput): Scenario {
  const r = input.renovation;
  if (!r) return buildUserScenario(input);
  const ua = r.existingUa;
  const c = r.existingCValue;
  return {
    id: "renovation-as-is",
    name: "現状維持",
    description: `${AGE_PRESETS[r.ageBracket].label} の性能のまま続ける。`,
    source: "preset",
    input: {
      ...input,
      insulationPreset: "custom",
      uaValue: ua,
      cValue: c,
      windowSpec: r.existingWindow,
      waterHeater: r.existingWaterHeater,
      heating: r.existingHeating,
      // 太陽光・蓄電池・HEMS は無し前提
      solarCapacity: 0,
      batteryCapacity: 0,
      hems: false,
      // リフォーム費用は計上しない
      // renovation を消すことで calculator の cost 加算を回避
      renovation: undefined,
    },
  };
}

/** リフォーム実施: 選択されたリフォーム項目で性能改善 */
export function buildRenovationAppliedScenario(input: HousingInput): Scenario {
  const r = input.renovation;
  if (!r) return buildUserScenario(input);

  // 選択された項目で UA / C を引き下げ（下限あり）
  let ua = r.existingUa;
  let c = r.existingCValue;
  for (const id of r.items) {
    const item = RENOVATION_ITEMS[id];
    ua = Math.max(0.20, ua - item.uaReduction);
    c = Math.max(0.5, c - item.cReduction);
  }

  // 内窓 / 窓交換が含まれる場合、窓仕様を Low-E ペア相当へ更新
  const upgradeWindow =
    r.items.includes("inner-window") || r.items.includes("window-replacement");

  return {
    id: "renovation-applied",
    name: "リフォーム実施",
    description: `${r.items.length} 項目を実施した場合の性能・コスト。`,
    source: "preset",
    input: {
      ...input,
      insulationPreset: "custom",
      uaValue: Number(ua.toFixed(2)),
      cValue: Number(c.toFixed(1)),
      windowSpec: upgradeWindow ? "resin-pair-lowe" : r.existingWindow,
      // 設備系はユーザーが設備ステップで指定したもの（input 側）を維持
      // リフォーム費用は calculator が renovation オブジェクトから計上する
    },
  };
}

/** UI から呼ぶ統合: モードに応じて選択可能なシナリオ集合を返す */
export function buildAllScenarios(input: HousingInput): Scenario[] {
  if (input.mode === "renovation") {
    return [
      buildRenovationAsIsScenario(input),
      buildRenovationAppliedScenario(input),
    ];
  }
  return [
    buildBaselineScenario(input),
    buildHighPerformanceScenario(input),
    buildHighPerformanceSolarBatteryScenario(input),
    buildUserScenario(input),
  ];
}

/** リフォーム入力の初期値（築年代から既存性能を補完） */
export function defaultRenovationInput(input: HousingInput) {
  const ageBracket = input.renovation?.ageBracket ?? "1980-1999";
  const ua = uaForAge(ageBracket, input.region);
  return {
    ageBracket,
    remainingYears: input.renovation?.remainingYears ?? 20,
    existingUa: input.renovation?.existingUa ?? ua,
    existingCValue: input.renovation?.existingCValue ?? AGE_PRESETS[ageBracket].cValue,
    existingWindow: input.renovation?.existingWindow ?? AGE_PRESETS[ageBracket].window,
    existingWaterHeater: input.renovation?.existingWaterHeater ?? "gas",
    existingHeating: input.renovation?.existingHeating ?? "ac-only",
    items: input.renovation?.items ?? [],
  } as const;
}
