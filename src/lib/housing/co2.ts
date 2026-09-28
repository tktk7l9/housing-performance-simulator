// CO2 emissions calculation
//
// Annual CO2 = (purchased electricity × electricity factor) + (gas consumption × gas factor)
// Sold electricity goes back to the grid, so it is not counted in household emissions (simplified).

import { CO2_EMISSION_FACTOR_ELECTRICITY, CO2_EMISSION_FACTOR_GAS } from "./data/co2";

export function calcAnnualCo2(buyKwh: number, gasM3: number): number {
  return buyKwh * CO2_EMISSION_FACTOR_ELECTRICITY + gasM3 * CO2_EMISSION_FACTOR_GAS;
}
