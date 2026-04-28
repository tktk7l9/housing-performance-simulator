// リフォーム部位別の代表単価
//
// 出典: 住宅省エネキャンペーン参考、リフォーム業界の中位レンジ（2025〜2026）。
// メーカー名は出さず、施工タイプ別の代表値のみで扱う。

import type { RenovationItemId } from "../types";

export interface RenovationItemData {
  id: RenovationItemId;
  label: string;
  /** 単位（円/単位） */
  unit: "perFloorAreaM2" | "perOpening" | "lumpSum";
  unitLabel: string;
  unitCost: number;
  /** UA 改善寄与（W/m²·K の減少量、6地域標準寄与） */
  uaReduction: number;
  /** C 値改善寄与（cm²/m² の減少量） */
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
 * 想定される窓箇所数（延床面積から概算）。
 * 35 ㎡ ≈ 1 階分として 8 箇所程度。
 */
export function estimateOpenings(floorAreaM2: number): number {
  return Math.max(6, Math.round((floorAreaM2 / 120) * 14));
}
