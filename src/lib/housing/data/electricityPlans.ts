// 電気・ガス料金 / 売電単価の代表値。
// 出典: 大手電力公開単価の平均レンジ（2025-2026年）。

import type { ElectricityRiseScenario } from "../types";

/** 単一料金（簡略） 円/kWh */
export const DEFAULT_ELECTRICITY_PRICE = 32;
/** ガス 円/m³（都市ガス基準） */
export const DEFAULT_GAS_PRICE = 200;
/** FIT 売電 円/kWh（2025年度・10kW未満想定） */
export const DEFAULT_SELL_PRICE_FIT = 15;
/** 卒FIT 売電 円/kWh */
export const DEFAULT_SELL_PRICE_POST_FIT = 8;
/** FIT 期間 年 */
export const FIT_YEARS = 10;

/** 電気代上昇シナリオ → 年率% */
export const ELECTRICITY_RISE_RATES: Record<ElectricityRiseScenario, number> = {
  flat: 0,
  moderate: 2,
  steep: 5,
};

/** ガス → 1次エネ熱量（kWh 相当換算） — 1m³ ≈ 11 kWh（都市ガス13A） */
export const GAS_KWH_PER_M3 = 11;
