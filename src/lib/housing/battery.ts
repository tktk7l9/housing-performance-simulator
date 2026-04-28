// 蓄電池による自家消費率の改善モデル
//
// ベース自家消費率（在宅パターン依存）→ 蓄電池容量に応じて段階的に向上。
// HEMS あればさらに +5% 改善。

import type { HousingInput } from "./types";

function baseSelfConsumptionRate(input: HousingInput): number {
  if (input.solarCapacity <= 0) return 0;
  return input.presence === "all-day" ? 0.40 : 0.30;
}

function batteryUplift(batteryKwh: number): number {
  // 0kWh→0, 5kWh→+0.25, 10kWh→+0.40, 15kWh→+0.50（漸近）
  if (batteryKwh <= 0) return 0;
  return 0.50 * (1 - Math.exp(-batteryKwh / 8));
}

export interface BatteryResult {
  selfConsumptionRate: number; // 0..1
}

export function calcSelfConsumption(input: HousingInput): BatteryResult {
  if (input.solarCapacity <= 0) return { selfConsumptionRate: 0 };
  const base = baseSelfConsumptionRate(input);
  const uplift = batteryUplift(input.batteryCapacity);
  const hems = input.hems ? 0.05 : 0;
  return {
    selfConsumptionRate: Math.min(0.95, base + uplift + hems),
  };
}
