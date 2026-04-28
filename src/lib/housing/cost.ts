// 初期費用と年間光熱費の計算
//
// 新築モード:
//   断熱プリセット追加コスト + 太陽光 + 蓄電池 + 給湯機 + 暖冷房 + HEMS
// リフォームモード（renovation 入力あり）:
//   選択された改修項目の単価合計 + 太陽光 + 蓄電池 + HEMS
//   (給湯機・暖冷房は新築モードと同じ扱い、現状維持シナリオは別途 0 で計算)
// 補助金は別計算。

import type { HousingInput } from "./types";
import { presetExtraCost } from "./data/insulationPresets";
import {
  WATER_HEATERS,
  HEATING_OPTIONS,
  SOLAR_COST_PER_KW,
  BATTERY_COST_PER_KWH,
  HEMS_COST,
} from "./data/equipment";
import { RENOVATION_ITEMS, estimateOpenings } from "./data/renovationCosts";

export interface InitialCostBreakdown {
  insulation: number;
  renovation: number;
  solar: number;
  battery: number;
  waterHeater: number;
  heating: number;
  hems: number;
  total: number;
}

export function calcRenovationCost(input: HousingInput): number {
  const r = input.renovation;
  if (!r) return 0;
  const openings = estimateOpenings(input.floorArea);
  let total = 0;
  for (const id of r.items) {
    const item = RENOVATION_ITEMS[id];
    if (item.unit === "perFloorAreaM2") total += item.unitCost * input.floorArea;
    else if (item.unit === "perOpening") total += item.unitCost * openings;
    else total += item.unitCost;
  }
  return total;
}

export function calcInitialCost(input: HousingInput): InitialCostBreakdown {
  // リフォームモードでは、給湯・暖冷房は既存設備の継続利用前提で初期費用に含めない。
  // renovation オブジェクト未設定（現状維持シナリオ）でも renovation 系列の費用 0 で
  // 集計するため、renovation の有無ではなく mode で分岐する。
  const isRenovation = input.mode === "renovation";
  const insulation = isRenovation ? 0 : presetExtraCost(input.insulationPreset, input.floorArea);
  const renovation = isRenovation ? calcRenovationCost(input) : 0;
  const solar = input.solarCapacity * SOLAR_COST_PER_KW;
  const battery = input.batteryCapacity * BATTERY_COST_PER_KWH;
  const waterHeater = isRenovation ? 0 : WATER_HEATERS[input.waterHeater].initialCost;
  const heating = isRenovation ? 0 : HEATING_OPTIONS[input.heating].initialCost;
  const hems = input.hems ? HEMS_COST : 0;
  return {
    insulation,
    renovation,
    solar,
    battery,
    waterHeater,
    heating,
    hems,
    total: insulation + renovation + solar + battery + waterHeater + heating + hems,
  };
}
