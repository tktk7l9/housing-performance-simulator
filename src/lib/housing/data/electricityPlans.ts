// Representative electricity/gas rates and feed-in prices.
// Source: average range of published rates from major power companies (2025-2026).

import type { ElectricityRiseScenario } from "../types";

/** Flat rate (simplified), yen/kWh */
export const DEFAULT_ELECTRICITY_PRICE = 32;
/** Gas, yen/m³ (city gas basis) */
export const DEFAULT_GAS_PRICE = 200;
/** FIT feed-in price, yen/kWh (FY2025, assuming under 10kW) */
export const DEFAULT_SELL_PRICE_FIT = 15;
/** Post-FIT (卒FIT) feed-in price, yen/kWh */
export const DEFAULT_SELL_PRICE_POST_FIT = 8;
/** FIT period, years */
export const FIT_YEARS = 10;

/** Electricity price rise scenario -> annual rate % */
export const ELECTRICITY_RISE_RATES: Record<ElectricityRiseScenario, number> = {
  flat: 0,
  moderate: 2,
  steep: 5,
};

/** Gas -> primary energy heat (kWh equivalent) — 1m³ ≈ 11 kWh (city gas 13A) */
export const GAS_KWH_PER_M3 = 11;
