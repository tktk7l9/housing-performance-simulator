// Rough solar generation estimate
//
// Annual generation = kW × regional horizontal annual irradiation (kWh/m²) × orientation factor × tilt factor × loss factor
// (simplified conversion that includes the effective receiving area of a 1kW panel)

import type { HousingInput } from "./types";
import {
  ANNUAL_HORIZONTAL_IRRADIANCE,
  ORIENTATION_FACTOR,
  tiltFactor,
  SOLAR_LOSS_FACTOR,
} from "./data/solarIrradiance";

export interface SolarResult {
  /** Annual generation kWh/year */
  annualKwh: number;
}

export function calcSolar(input: HousingInput): SolarResult {
  if (input.solarCapacity <= 0) return { annualKwh: 0 };
  const irrad = ANNUAL_HORIZONTAL_IRRADIANCE[input.region];
  const orient = ORIENTATION_FACTOR[input.solarOrientation];
  const tilt = tiltFactor(input.solarTilt);
  const annualKwh = input.solarCapacity * irrad * orient * tilt * SOLAR_LOSS_FACTOR;
  return { annualKwh };
}
