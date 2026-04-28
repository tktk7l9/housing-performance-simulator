// 築年代から既存住宅の性能を推定する代表値テーブル
//
// 出典: 国交省「住宅省エネ基準の変遷」概要、国総研報告から代表値を抜粋。
// 6 地域基準で UA を提示。実物件は仕様で大きく変動するため、ヒント値として扱う。
// lastUpdated: 2026-04

import type { AgeBracket, RegionId, WindowSpecId } from "../types";

export interface AgePresetData {
  id: AgeBracket;
  label: string;
  /** 6 地域基準の UA 値 */
  uaBase: number;
  /** C 値の代表値（cm²/m²） */
  cValue: number;
  /** 代表的な窓仕様 */
  window: WindowSpecId;
  description: string;
}

export const AGE_PRESETS: Record<AgeBracket, AgePresetData> = {
  "before-1980": {
    id: "before-1980",
    label: "〜1980年（旧省エネ基準以前）",
    uaBase: 1.80,
    cValue: 8.0,
    window: "alum-pair",
    description: "断熱材ほぼなし。アルミ単板〜ペア。冬場の体感温度が極めて低い。",
  },
  "1980-1999": {
    id: "1980-1999",
    label: "1980〜1999年（旧省エネ・新省エネ基準）",
    uaBase: 1.20,
    cValue: 5.0,
    window: "alum-pair",
    description: "壁にグラスウール 50mm 程度、窓はアルミ枠ペア。",
  },
  "2000-2009": {
    id: "2000-2009",
    label: "2000〜2009年（次世代省エネ基準）",
    uaBase: 0.95,
    cValue: 3.0,
    window: "alum-pair",
    description: "次世代基準前後。地域差大きい。",
  },
  "2010-later": {
    id: "2010-later",
    label: "2010年〜（H25/省エネ基準）",
    uaBase: 0.80,
    cValue: 2.5,
    window: "alum-resin-pair-lowe",
    description: "サッシは複合枠 Low-E が主流に。",
  },
};

/**
 * 地域別の補正：寒冷地ほど既存住宅も(やや)断熱が強い傾向を反映する単純な比率。
 * UA は 6 地域基準。1〜3 地域は 0.85倍（より断熱されている代表値）、6〜8 はそのまま。
 */
export function uaForAge(bracket: AgeBracket, region: RegionId): number {
  const base = AGE_PRESETS[bracket].uaBase;
  if (region <= 3) return Number((base * 0.85).toFixed(2));
  if (region <= 5) return Number((base * 0.92).toFixed(2));
  return base;
}
