// Regions 1-8: based on the classification in the energy-saving standard notice
// HDD18 (heating degree days, base 18℃) / CDD24 (cooling degree days, base 24℃) are
// rough values (℃·day) based on normal-year values of each region's representative city.
// Source: representative values based on the energy-saving standard notice and JMA normals. Actual values vary with local terrain and city.

import type { RegionId } from "../types";

export interface RegionData {
  id: RegionId;
  name: string;
  representative: string;
  /** Heating degree days (℃·day) */
  hdd18: number;
  /** Cooling degree days (℃·day) */
  cdd24: number;
}

export const REGIONS: Record<RegionId, RegionData> = {
  1: { id: 1, name: "1地域", representative: "旭川など", hdd18: 4500, cdd24: 50 },
  2: { id: 2, name: "2地域", representative: "札幌・盛岡など", hdd18: 3500, cdd24: 100 },
  3: { id: 3, name: "3地域", representative: "青森・長野など", hdd18: 2700, cdd24: 200 },
  4: { id: 4, name: "4地域", representative: "仙台・福島など", hdd18: 2200, cdd24: 300 },
  5: { id: 5, name: "5地域", representative: "宇都宮・新潟など", hdd18: 2000, cdd24: 400 },
  6: { id: 6, name: "6地域", representative: "東京・大阪・名古屋など", hdd18: 1500, cdd24: 500 },
  7: { id: 7, name: "7地域", representative: "鹿児島・宮崎など", hdd18: 1000, cdd24: 600 },
  8: { id: 8, name: "8地域", representative: "沖縄など", hdd18: 200, cdd24: 800 },
};

export const REGION_LIST: RegionData[] = Object.values(REGIONS);
