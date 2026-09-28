// Equipment efficiency values and representative initial costs.
// No manufacturer names; handled by equipment category + efficiency value.

import type { HeatingId, WaterHeaterId } from "../types";

export interface WaterHeaterData {
  id: WaterHeaterId;
  name: string;
  /** Overall efficiency of the water heater (COP equivalent, primary energy basis) — thermal efficiency for gas */
  efficiency: number;
  /** Energy type */
  energy: "electricity" | "gas" | "hybrid";
  /** Representative initial cost, yen */
  initialCost: number;
}

export const WATER_HEATERS: Record<WaterHeaterId, WaterHeaterData> = {
  "eco-cute": {
    id: "eco-cute",
    name: "エコキュート（ヒートポンプ給湯）",
    efficiency: 3.5,
    energy: "electricity",
    initialCost: 600_000,
  },
  gas: {
    id: "gas",
    name: "ガス給湯（高効率）",
    efficiency: 0.95,
    energy: "gas",
    initialCost: 350_000,
  },
  "ene-farm": {
    id: "ene-farm",
    name: "エネファーム（ガス + 発電）",
    efficiency: 1.4,
    energy: "hybrid",
    initialCost: 1_400_000,
  },
};

export interface HeatingData {
  id: HeatingId;
  name: string;
  /** Heating COP */
  copHeating: number;
  /** Cooling COP */
  copCooling: number;
  /** Representative initial cost, yen (for multiple rooms) */
  initialCost: number;
}

export const HEATING_OPTIONS: Record<HeatingId, HeatingData> = {
  "ac-only": {
    id: "ac-only",
    name: "壁掛けエアコン（複数台）",
    copHeating: 4.5,
    copCooling: 5.5,
    initialCost: 600_000,
  },
  "floor-heating": {
    id: "floor-heating",
    name: "床暖房 + エアコン",
    copHeating: 4.0,
    copCooling: 5.0,
    initialCost: 1_400_000,
  },
  "central-air": {
    id: "central-air",
    name: "全館空調",
    copHeating: 3.8,
    copCooling: 4.2,
    initialCost: 2_200_000,
  },
};

/** Solar, yen/kW (midpoint of the typical range including mounts, power conditioner and installation) */
export const SOLAR_COST_PER_KW = 240_000;
/** Battery, yen/kWh */
export const BATTERY_COST_PER_KWH = 180_000;
/** HEMS full set, yen */
export const HEMS_COST = 200_000;

/** Other appliances, assumed kWh/person/year */
export const OTHER_KWH_PER_PERSON_YEAR = 1200;

/** For solar and battery replacement timing and cost, this MVP counts only the initial cost.
 *  Replacement costs during the period are disclosed as "not included" in AssumptionsPanel. */
