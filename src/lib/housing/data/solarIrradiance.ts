// Rough annual solar irradiation per region (kWh/m²/year, horizontal plane)
// Source: estimated from each region's representative city in the NEDO irradiance database MONSOLA-20.
// Orientation and tilt corrections are handled separately by the coefficient tables in solar.ts.

import type { RegionId, SolarOrientation } from "../types";

/** Annual irradiation per region (kWh/m²) — rough horizontal-plane value before conversion to optimal tilt / south-facing */
export const ANNUAL_HORIZONTAL_IRRADIANCE: Record<RegionId, number> = {
  1: 1180,
  2: 1240,
  3: 1280,
  4: 1320,
  5: 1340,
  6: 1380,
  7: 1420,
  8: 1500,
};

/** Orientation correction factor (south = 1.0) */
export const ORIENTATION_FACTOR: Record<SolarOrientation, number> = {
  south: 1.0,
  "south-east": 0.96,
  "south-west": 0.96,
  east: 0.86,
  west: 0.86,
};

/**
 * Tilt correction factor — increases slightly from 0° (horizontal) to the optimal tilt (≈30°)
 * and decreases slightly at excessive tilt; a simple model.
 */
export function tiltFactor(tiltDeg: number): number {
  // Continuous function of about 1.10 near 30°, 1.00 horizontal, 0.70 vertical
  const t = Math.max(0, Math.min(90, tiltDeg));
  if (t <= 30) return 1.0 + (t / 30) * 0.10;
  // Linear decrease from 1.10 to 0.70 over 30→90
  return 1.10 - ((t - 30) / 60) * 0.40;
}

/** Overall solar loss factor (power conditioner, wiring, temperature, soiling) */
export const SOLAR_LOSS_FACTOR = 0.85;
