// Calculation of initial cost and annual utility cost
//
// New-build mode:
//   insulation preset extra cost + solar + battery + water heater + heating/cooling + HEMS
// Renovation mode (with renovation input):
//   sum of unit prices of the selected renovation items + solar + battery + HEMS
//   (water heater and heating/cooling are treated as in new-build mode; the keep-as-is scenario is computed separately as 0)
// Subsidies are calculated separately.

import type { HousingInput } from "./types";
import { presetExtraCost } from "./data/insulationPresets";
import {
  WATER_HEATERS,
  HEATING_OPTIONS,
  SOLAR_COST_PER_KW,
  BATTERY_COST_PER_KWH,
  HEMS_COST,
} from "./data/equipment";
import { RENOVATION_ITEMS, estimateOpenings } from "./data/renovationCosts";

export interface InitialCostBreakdown {
  insulation: number;
  renovation: number;
  solar: number;
  battery: number;
  waterHeater: number;
  heating: number;
  hems: number;
  total: number;
}

export function calcRenovationCost(input: HousingInput): number {
  const r = input.renovation;
  if (!r) return 0;
  const openings = estimateOpenings(input.floorArea);
  let total = 0;
  for (const id of r.items) {
    const item = RENOVATION_ITEMS[id];
    if (item.unit === "perFloorAreaM2") total += item.unitCost * input.floorArea;
    else if (item.unit === "perOpening") total += item.unitCost * openings;
    else total += item.unitCost;
  }
  return total;
}

export function calcInitialCost(input: HousingInput): InitialCostBreakdown {
  // In renovation mode, hot water and heating/cooling assume continued use of existing equipment and are excluded from initial cost.
  // Even without a renovation object (keep-as-is scenario), renovation-related costs are totaled as 0,
  // so branch on mode rather than on whether renovation exists.
  const isRenovation = input.mode === "renovation";
  const insulation = isRenovation ? 0 : presetExtraCost(input.insulationPreset, input.floorArea);
  const renovation = isRenovation ? calcRenovationCost(input) : 0;
  const solar = input.solarCapacity * SOLAR_COST_PER_KW;
  const battery = input.batteryCapacity * BATTERY_COST_PER_KWH;
  const waterHeater = isRenovation ? 0 : WATER_HEATERS[input.waterHeater].initialCost;
  const heating = isRenovation ? 0 : HEATING_OPTIONS[input.heating].initialCost;
  const hems = input.hems ? HEMS_COST : 0;
  return {
    insulation,
    renovation,
    solar,
    battery,
    waterHeater,
    heating,
    hems,
    total: insulation + renovation + solar + battery + waterHeater + heating + hems,
  };
}
