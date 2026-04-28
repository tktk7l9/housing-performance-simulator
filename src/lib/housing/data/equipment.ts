// 設備系の効率値・代表初期費用。
// メーカー名は出さず、機器カテゴリ + 効率値で扱う。

import type { HeatingId, WaterHeaterId } from "../types";

export interface WaterHeaterData {
  id: WaterHeaterId;
  name: string;
  /** 給湯機器の総合効率（COP 相当・1次エネ換算）— ガスは熱効率 */
  efficiency: number;
  /** エネルギー種別 */
  energy: "electricity" | "gas" | "hybrid";
  /** 代表初期費用 円 */
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
  /** 暖房 COP */
  copHeating: number;
  /** 冷房 COP */
  copCooling: number;
  /** 代表初期費用 円（複数室分） */
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

/** 太陽光 円/kW（架台・パワコン・施工込みの一般的なレンジ中央値） */
export const SOLAR_COST_PER_KW = 240_000;
/** 蓄電池 円/kWh */
export const BATTERY_COST_PER_KWH = 180_000;
/** HEMS 一式 円 */
export const HEMS_COST = 200_000;

/** その他家電 想定 kWh/人/年 */
export const OTHER_KWH_PER_PERSON_YEAR = 1200;

/** 太陽光・蓄電池の交換タイミングと費用は本MVPでは初期費用のみ計上する。
 *  期間中の交換費用は AssumptionsPanel で「未計上」と開示する。 */
