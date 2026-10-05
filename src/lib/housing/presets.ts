// Comparison presets
//   New-build mode: standard / high performance / high performance+solar+battery / user
//   Renovation mode: keep as is / renovate

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

/** Standard: energy-saving standard, no solar, no battery */
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

/** High performance: HEAT20 G2, resin sashes, no solar */
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

/** High performance + solar + battery */
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

/** Turn user input into a scenario (new build) */
export function buildUserScenario(input: HousingInput): Scenario {
  return {
    id: "user",
    name: "あなたの仕様",
    description: "入力された条件のままシミュレーション。",
    source: "user",
    input,
  };
}

// ── Renovation mode ────────────────────────────────────────────

/** Keep as is: keep paying utility costs with the existing performance (zero extra investment) */
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
      // Assumes no solar, battery or HEMS
      solarCapacity: 0,
      batteryCapacity: 0,
      hems: false,
      // Renovation cost is not counted
      // Removing renovation avoids the cost addition in calculator
      renovation: undefined,
    },
  };
}

/** Renovate: improve performance with the selected renovation items */
export function buildRenovationAppliedScenario(input: HousingInput): Scenario {
  const r = input.renovation;
  if (!r) return buildUserScenario(input);

  // Lower UA / C by the selected items (with a floor)
  let ua = r.existingUa;
  let c = r.existingCValue;
  for (const id of r.items) {
    const item = RENOVATION_ITEMS[id];
    ua = Math.max(0.20, ua - item.uaReduction);
    c = Math.max(0.5, c - item.cReduction);
  }

  // If inner windows / window replacement are included, upgrade the window spec to Low-E pair equivalent
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
      // Equipment keeps what the user chose on the equipment step (from input).
      // The calculator adds renovation costs from the renovation object.
    },
  };
}

/** Entry point called from the UI: return the selectable scenario set for the mode */
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

/** Initial renovation input (existing performance filled in from construction era) */
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
