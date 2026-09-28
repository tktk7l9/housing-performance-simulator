// Hot water energy calculation
//
// Hot water heat per person decreases with region and household size (economies of scale).
// Converted to consumed energy by equipment efficiency (COP / thermal efficiency).

import type { HousingInput } from "./types";
import { WATER_HEATERS } from "./data/equipment";
import { GAS_KWH_PER_M3 } from "./data/electricityPlans";
import { REGIONS } from "./data/regions";

/** Base hot water heat kWh/person/year (region 6, typical use).
 *  A factor derived from the region raises the required heat in colder areas, where water is colder. */
const HEAT_DEMAND_BASE_PER_PERSON = 1500;

function regionFactor(regionId: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): number {
  // Correction using HDD18 normalized by 1500
  const hdd = REGIONS[regionId].hdd18;
  return 0.85 + (hdd / 1500) * 0.15;
}

function householdScaleFactor(household: number): number {
  // Decreasing like 1 person=1.0, 2=0.9, 4=0.8, 6=0.75
  if (household <= 1) return 1.0;
  return 1.0 - 0.05 * Math.min(household - 1, 5);
}

export interface HotWaterResult {
  /** Hot water heat demand kWh/year */
  demandHeatKwh: number;
  /** Electricity consumption kWh/year (electric water heating) */
  electricityKwh: number;
  /** Gas consumption m³/year (gas-based water heating) */
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
  // hybrid (Ene-Farm): gas produces heat + electricity -> simplified: gas 70%, generation offsets 30%
  const heatNeededKwh = (baseHeat * 0.7) / 0.85;
  return {
    demandHeatKwh: baseHeat,
    electricityKwh: -baseHeat * 0.3 / 0.95, // 発電で家庭消費を相殺（マイナスで返す）
    gasM3: heatNeededKwh / GAS_KWH_PER_M3,
  };
}
