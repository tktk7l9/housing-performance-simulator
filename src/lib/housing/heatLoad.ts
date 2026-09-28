// Rough heating/cooling load (based on the extended degree-day method)
//
// Q_heat = UA × A × HDD18 × 24 / 1000  [kWh/year]
// Q_cool = UA × A × CDD24 × 24 / 1000 × 0.6 [kWh/year]   (cooling is corrected by a factor for thermal storage and solar gain)
// Ventilation heat loss correction: higher C value means more heat loss from drafts -> added via a simple factor
//
// Equipment power consumption = load ÷ COP

import { REGIONS } from "./data/regions";
import { HEATING_OPTIONS } from "./data/equipment";
import type { HousingInput } from "./types";

const COOLING_LOAD_FACTOR = 0.6;

function ventilationLossFactor(cValue: number): number {
  // Correction of about C value 0.5 → 1.00, 1.0 → 1.04, 2.0 → 1.10, 5.0 → 1.25
  return 1.0 + Math.max(0, cValue - 0.5) * 0.05;
}

export interface HeatLoadResult {
  /** Heating load kWh/year */
  heatingLoadKwh: number;
  /** Cooling load kWh/year */
  coolingLoadKwh: number;
  /** Heating/cooling equipment power consumption kWh/year */
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
