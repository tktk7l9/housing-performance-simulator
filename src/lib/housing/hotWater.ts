// 給湯エネルギー計算
//
// 1人当たり給湯熱量は地域・人数規模で逓減する（規模の経済）。
// 機器効率（COP・熱効率）で消費エネルギーへ変換。

import type { HousingInput } from "./types";
import { WATER_HEATERS } from "./data/equipment";
import { GAS_KWH_PER_M3 } from "./data/electricityPlans";
import { REGIONS } from "./data/regions";

/** 給湯熱量基本値 kWh/人/年 (6地域・標準的な使用)。
 *  寒冷地ほど水温が低く必要熱量が増える係数を地域から導出する。 */
const HEAT_DEMAND_BASE_PER_PERSON = 1500;

function regionFactor(regionId: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): number {
  // HDD18 を 1500 で正規化した補正
  const hdd = REGIONS[regionId].hdd18;
  return 0.85 + (hdd / 1500) * 0.15;
}

function householdScaleFactor(household: number): number {
  // 1人=1.0, 2人=0.9, 4人=0.8, 6人=0.75 のような逓減
  if (household <= 1) return 1.0;
  return 1.0 - 0.05 * Math.min(household - 1, 5);
}

export interface HotWaterResult {
  /** 給湯需要熱量 kWh/年 */
  demandHeatKwh: number;
  /** 電力消費 kWh/年（電気給湯時） */
  electricityKwh: number;
  /** ガス消費 m³/年（ガス系給湯時） */
  gasM3: number;
}

export function calcHotWater(input: HousingInput): HotWaterResult {
  const baseHeat =
    HEAT_DEMAND_BASE_PER_PERSON * input.household *
    regionFactor(input.region) * householdScaleFactor(input.household);

  const heater = WATER_HEATERS[input.waterHeater];
  if (heater.energy === "electricity") {
    return {
      demandHeatKwh: baseHeat,
      electricityKwh: baseHeat / heater.efficiency,
      gasM3: 0,
    };
  }
  if (heater.energy === "gas") {
    const heatNeededKwh = baseHeat / heater.efficiency;
    return {
      demandHeatKwh: baseHeat,
      electricityKwh: 0,
      gasM3: heatNeededKwh / GAS_KWH_PER_M3,
    };
  }
  // hybrid (エネファーム): ガスで発熱 + 発電 → 簡易: ガス70%, 発電で 30% を相殺
  const heatNeededKwh = (baseHeat * 0.7) / 0.85;
  return {
    demandHeatKwh: baseHeat,
    electricityKwh: -baseHeat * 0.3 / 0.95, // 発電で家庭消費を相殺（マイナスで返す）
    gasM3: heatNeededKwh / GAS_KWH_PER_M3,
  };
}
