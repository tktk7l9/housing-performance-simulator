// 暖冷房負荷の概算（拡張デグリーデー法ベース）
//
// Q_heat = UA × A × HDD18 × 24 / 1000  [kWh/年]
// Q_cool = UA × A × CDD24 × 24 / 1000 × 0.6 [kWh/年]   (冷房は蓄熱・日射の影響を係数で補正)
// 換気熱損失補正: C値が大きいほど隙間風による熱損失増 → 簡易係数で加算
//
// 機器消費電力 = 負荷 ÷ COP

import { REGIONS } from "./data/regions";
import { HEATING_OPTIONS } from "./data/equipment";
import type { HousingInput } from "./types";

const COOLING_LOAD_FACTOR = 0.6;

function ventilationLossFactor(cValue: number): number {
  // C値 0.5 → 1.00, 1.0 → 1.04, 2.0 → 1.10, 5.0 → 1.25 程度の補正
  return 1.0 + Math.max(0, cValue - 0.5) * 0.05;
}

export interface HeatLoadResult {
  /** 暖房負荷 kWh/年 */
  heatingLoadKwh: number;
  /** 冷房負荷 kWh/年 */
  coolingLoadKwh: number;
  /** 暖冷房 機器消費電力 kWh/年 */
  totalEnergyKwh: number;
}

export function calcHeatLoad(input: HousingInput): HeatLoadResult {
  const region = REGIONS[input.region];
  const heating = HEATING_OPTIONS[input.heating];
  const ventFactor = ventilationLossFactor(input.cValue);

  const heatingLoad =
    (input.uaValue * input.floorArea * region.hdd18 * 24) / 1000 * ventFactor;
  const coolingLoad =
    (input.uaValue * input.floorArea * region.cdd24 * 24) / 1000 * COOLING_LOAD_FACTOR * ventFactor;

  const heatingEnergy = heatingLoad / heating.copHeating;
  const coolingEnergy = coolingLoad / heating.copCooling;

  return {
    heatingLoadKwh: heatingLoad,
    coolingLoadKwh: coolingLoad,
    totalEnergyKwh: heatingEnergy + coolingEnergy,
  };
}
