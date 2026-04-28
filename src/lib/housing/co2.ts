// CO2 排出量計算
//
// 年間 CO2 = (買電量 × 電気係数) + (ガス消費 × ガス係数)
// 売電は系統に戻すため家庭の排出にはカウントしない（簡易）。

import { CO2_EMISSION_FACTOR_ELECTRICITY, CO2_EMISSION_FACTOR_GAS } from "./data/co2";

export function calcAnnualCo2(buyKwh: number, gasM3: number): number {
  return buyKwh * CO2_EMISSION_FACTOR_ELECTRICITY + gasM3 * CO2_EMISSION_FACTOR_GAS;
}
