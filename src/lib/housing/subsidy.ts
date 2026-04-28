// 補助金の自動マッチ + 適用合計
//
// MVP は全国対象の代表補助金のみ扱う。住所→都道府県別マッチングは Phase D 拡張。

import type { HousingInput, SubsidyMaster } from "./types";
import { SUBSIDIES } from "./data/subsidies";

const INSULATION_RANK: Record<string, number> = {
  "energy-saving": 0,
  zeh: 1,
  "heat20-g1": 2,
  "heat20-g2": 3,
  "heat20-g3": 4,
  custom: 0,
};

export function matchSubsidies(input: HousingInput): SubsidyMaster[] {
  const inputRank = INSULATION_RANK[input.insulationPreset] ?? 0;
  return SUBSIDIES.filter((s) => {
    if (s.requiredInsulation) {
      const need = INSULATION_RANK[s.requiredInsulation];
      if (inputRank < need) return false;
    }
    if (s.requiresSolar && input.solarCapacity <= 0) return false;
    return true;
  });
}

export function totalSubsidyAmount(input: HousingInput, ids: string[]): number {
  const matched = matchSubsidies(input);
  return matched
    .filter((s) => ids.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);
}
