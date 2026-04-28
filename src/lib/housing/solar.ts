// 太陽光発電量の概算
//
// 年間発電量 = kW × 地域水平面年間日射量(kWh/m²) × 方位係数 × 傾斜係数 × 損失係数
// (1kW のパネルが受光する有効面積を含めた簡易換算式)

import type { HousingInput } from "./types";
import {
  ANNUAL_HORIZONTAL_IRRADIANCE,
  ORIENTATION_FACTOR,
  tiltFactor,
  SOLAR_LOSS_FACTOR,
} from "./data/solarIrradiance";

export interface SolarResult {
  /** 年間発電量 kWh/年 */
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
