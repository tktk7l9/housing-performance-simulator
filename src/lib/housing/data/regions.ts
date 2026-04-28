// 地域区分 1〜8: 省エネ基準告示の区分に基づく
// HDD18 (暖房デグリーデー 基準温度18℃) / CDD24 (冷房デグリーデー 基準温度24℃) は
// 各地域の代表都市の平年値を参考とした概算値（℃·日）。
// 出典: 省エネ基準告示・気象庁平年値ベースの代表値。実値は微地形・都市差で変動する。

import type { RegionId } from "../types";

export interface RegionData {
  id: RegionId;
  name: string;
  representative: string;
  /** 暖房デグリーデー (℃·日) */
  hdd18: number;
  /** 冷房デグリーデー (℃·日) */
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
