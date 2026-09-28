// Representative unit prices per renovation part
//
// Source: based on the 住宅省エネキャンペーン (housing energy-saving campaign), mid range of the renovation industry (2025-2026).
// No manufacturer names; only representative values per construction type.

import type { RenovationItemId } from "../types";

export interface RenovationItemData {
  id: RenovationItemId;
  label: string;
  /** Unit (yen/unit) */
  unit: "perFloorAreaM2" | "perOpening" | "lumpSum";
  unitLabel: string;
  unitCost: number;
  /** UA improvement contribution (reduction in W/m²·K, standard contribution for region 6) */
  uaReduction: number;
  /** C value improvement contribution (reduction in cm²/m²) */
  cReduction: number;
  description: string;
}

export const RENOVATION_ITEMS: Record<RenovationItemId, RenovationItemData> = {
  "external-insulation": {
    id: "external-insulation",
    label: "外張り断熱（外壁）",
    unit: "perFloorAreaM2",
    unitLabel: "円/㎡（延床）",
    unitCost: 22000,
    uaReduction: 0.20,
    cReduction: 1.0,
    description: "既存外壁の上から断熱材を施工。性能改善が大きい。",
  },
  "internal-insulation": {
    id: "internal-insulation",
    label: "内張り断熱（外壁内側）",
    unit: "perFloorAreaM2",
    unitLabel: "円/㎡（延床）",
    unitCost: 12000,
    uaReduction: 0.10,
    cReduction: 0.5,
    description: "既存壁の内側に断熱材を増し張り。施工は容易だが室内が狭くなる。",
  },
  "ceiling-insulation": {
    id: "ceiling-insulation",
    label: "天井（小屋裏）断熱",
    unit: "perFloorAreaM2",
    unitLabel: "円/㎡（延床）",
    unitCost: 4500,
    uaReduction: 0.06,
    cReduction: 0.0,
    description: "小屋裏に断熱材を吹込み or 敷込み。比較的安価で効果的。",
  },
  "floor-insulation": {
    id: "floor-insulation",
    label: "床下断熱",
    unit: "perFloorAreaM2",
    unitLabel: "円/㎡（延床）",
    unitCost: 5500,
    uaReduction: 0.05,
    cReduction: 0.0,
    description: "床下から断熱材を充填。冬場の足元寒さに直接効く。",
  },
  "inner-window": {
    id: "inner-window",
    label: "内窓（二重サッシ）",
    unit: "perOpening",
    unitLabel: "円/箇所",
    unitCost: 80000,
    uaReduction: 0.04,
    cReduction: 0.5,
    description: "既存窓の内側に追加。窓1箇所ごとに計上。",
  },
  "window-replacement": {
    id: "window-replacement",
    label: "窓交換（樹脂サッシ Low-E）",
    unit: "perOpening",
    unitLabel: "円/箇所",
    unitCost: 200000,
    uaReduction: 0.06,
    cReduction: 1.0,
    description: "既存サッシごと交換。性能は内窓より高いが費用大。",
  },
  "airtight-improvement": {
    id: "airtight-improvement",
    label: "気密改修（隙間処理）",
    unit: "lumpSum",
    unitLabel: "一式",
    unitCost: 350000,
    uaReduction: 0.0,
    cReduction: 1.5,
    description: "気流止め・隙間テープ等。気密性能の向上に直接効く。",
  },
};

/**
 * Assumed number of window locations (estimated from total floor area).
 * About 8 locations per 35 ㎡ ≈ one floor.
 */
export function estimateOpenings(floorAreaM2: number): number {
  return Math.max(6, Math.round((floorAreaM2 / 120) * 14));
}
