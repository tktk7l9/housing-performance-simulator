// Insulation presets: representative UA/C values per grade and assumed extra initial cost (increment over the standard = energy-saving standard).
// Source: MLIT energy-saving standard notice (省エネ基準告示) / HEAT20 design guidebook / midpoint of typical builder cost ranges.
// Prices assume 120m² floor area. AssumptionsPanel discloses that actual prices vary widely by region and construction method.

import type { InsulationPresetId, RegionId } from "../types";

export interface InsulationPresetData {
  id: InsulationPresetId;
  name: string;
  description: string;
  /** UA value for region 6 */
  uaByRegion: Record<RegionId, number>;
  /** C value (common target) */
  cValue: number;
  /** Extra cost over the standard (energy-saving standard), yen (for 120m² floor area) */
  extraCostBase120m2: number;
}

export const INSULATION_PRESETS: Record<Exclude<InsulationPresetId, "custom">, InsulationPresetData> = {
  "energy-saving": {
    id: "energy-saving",
    name: "省エネ基準",
    description: "2025年4月以降の新築義務基準（地域区分6で UA=0.87）。",
    uaByRegion: { 1: 0.46, 2: 0.46, 3: 0.56, 4: 0.75, 5: 0.87, 6: 0.87, 7: 0.87, 8: 3.32 },
    cValue: 5.0,
    extraCostBase120m2: 0,
  },
  zeh: {
    id: "zeh",
    name: "ZEH 基準",
    description: "ネット・ゼロ・エネルギー・ハウス基準。太陽光と組み合わせて成立。",
    uaByRegion: { 1: 0.40, 2: 0.40, 3: 0.50, 4: 0.60, 5: 0.60, 6: 0.60, 7: 0.60, 8: 1.00 },
    cValue: 2.0,
    extraCostBase120m2: 600_000,
  },
  "heat20-g1": {
    id: "heat20-g1",
    name: "HEAT20 G1",
    description: "夏冬とも最低体感温度を確保する断熱グレード。",
    uaByRegion: { 1: 0.34, 2: 0.34, 3: 0.38, 4: 0.46, 5: 0.48, 6: 0.56, 7: 0.56, 8: 0.80 },
    cValue: 1.5,
    extraCostBase120m2: 1_000_000,
  },
  "heat20-g2": {
    id: "heat20-g2",
    name: "HEAT20 G2",
    description: "冬期最低体感温度13℃確保レベル。一般的な高性能住宅の指標。",
    uaByRegion: { 1: 0.28, 2: 0.28, 3: 0.28, 4: 0.34, 5: 0.34, 6: 0.46, 7: 0.46, 8: 0.70 },
    cValue: 1.0,
    extraCostBase120m2: 1_700_000,
  },
  "heat20-g3": {
    id: "heat20-g3",
    name: "HEAT20 G3",
    description: "冬期最低体感温度15℃確保レベル。寒冷地の超高性能。",
    uaByRegion: { 1: 0.20, 2: 0.20, 3: 0.20, 4: 0.23, 5: 0.23, 6: 0.26, 7: 0.26, 8: 0.50 },
    cValue: 0.7,
    extraCostBase120m2: 2_800_000,
  },
};

/** Return the extra cost for a preset ID scaled by floor area */
export function presetExtraCost(presetId: InsulationPresetId, floorArea: number): number {
  if (presetId === "custom") return 0;
  const base = INSULATION_PRESETS[presetId].extraCostBase120m2;
  return base * (floorArea / 120);
}
