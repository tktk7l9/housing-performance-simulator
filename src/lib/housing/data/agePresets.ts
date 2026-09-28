// Table of representative values for estimating existing-house performance from construction era
//
// Source: representative values excerpted from MLIT's overview of "住宅省エネ基準の変遷" (history of housing energy standards) and NILIM reports.
// UA is given for region 6. Actual houses vary widely by spec, so treat these as hint values.
// lastUpdated: 2026-04

import type { AgeBracket, RegionId, WindowSpecId } from "../types";

export interface AgePresetData {
  id: AgeBracket;
  label: string;
  /** UA value for region 6 */
  uaBase: number;
  /** Representative C value (cm²/m²) */
  cValue: number;
  /** Representative window spec */
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
 * Regional adjustment: a simple ratio reflecting that existing houses in colder regions tend to be (somewhat) better insulated.
 * UA is based on region 6. Regions 1-3 use 0.85x (more insulated representative value), 6-8 are unchanged.
 */
export function uaForAge(bracket: AgeBracket, region: RegionId): number {
  const base = AGE_PRESETS[bracket].uaBase;
  if (region <= 3) return Number((base * 0.85).toFixed(2));
  if (region <= 5) return Number((base * 0.92).toFixed(2));
  return base;
}
