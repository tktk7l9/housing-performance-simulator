// シナリオ計算オーケストレータ
//
// 入力 → (建物熱負荷 + 給湯 + 太陽光 + 蓄電池 + その他家電) → 年間光熱費
// → 年次積上げ（電気代上昇率・FIT/卒FIT 反映） → 累計コスト・CO2

import type {
  HousingInput,
  ScenarioResult,
  Scenario,
  SimulationOutput,
  YearlyEntry,
  AssumptionSnapshot,
} from "./types";
import { calcHeatLoad } from "./heatLoad";
import { calcHotWater } from "./hotWater";
import { calcSolar } from "./solar";
import { calcSelfConsumption } from "./battery";
import { calcInitialCost } from "./cost";
import { totalSubsidyAmount } from "./subsidy";
import { calcAnnualCo2 } from "./co2";
import { OTHER_KWH_PER_PERSON_YEAR, SOLAR_COST_PER_KW } from "./data/equipment";
import {
  ELECTRICITY_RISE_RATES,
  FIT_YEARS,
  GAS_KWH_PER_M3,
} from "./data/electricityPlans";
import {
  CO2_EMISSION_FACTOR_ELECTRICITY,
  CO2_EMISSION_FACTOR_GAS,
} from "./data/co2";
import { SOLAR_LOSS_FACTOR } from "./data/solarIrradiance";
import { buildBaselineScenario, buildRenovationAsIsScenario } from "./presets";

const NEW_BUILD_BASELINE_ID = "preset-baseline";
const RENOVATION_BASELINE_ID = "renovation-as-is";

function baselineIdFor(input: HousingInput): string {
  return input.mode === "renovation" ? RENOVATION_BASELINE_ID : NEW_BUILD_BASELINE_ID;
}

/** 1シナリオの単発計算 */
function calcOneScenario(input: HousingInput, scenarioId: string, scenarioName: string): ScenarioResult {
  const heat = calcHeatLoad(input);
  const hw = calcHotWater(input);
  const solar = calcSolar(input);
  const sc = calcSelfConsumption(input);
  const other = OTHER_KWH_PER_PERSON_YEAR * input.household * (input.hems ? 0.95 : 1.0);

  // 家庭の年間電力消費 (太陽光ない時の総消費)
  const totalConsumeKwh = heat.totalEnergyKwh + Math.max(0, hw.electricityKwh) + other;

  // 自家消費は世帯の総消費を上限とし、超過は余剰として売電に回す
  // （これをしないと「使い切れない発電」が宙に浮き、売電収入が過小計上される）
  const rawSelfConsume = solar.annualKwh * sc.selfConsumptionRate;
  const selfConsumeKwh = Math.min(rawSelfConsume, totalConsumeKwh);
  const surplusKwh = Math.max(0, solar.annualKwh - selfConsumeKwh);
  const buyKwh = Math.max(0, totalConsumeKwh - selfConsumeKwh);

  // 給湯がエネファーム等で電力相殺（マイナス値）の場合、買電を更に減らす
  const buyKwhAfterEneFarm = hw.electricityKwh < 0 ? Math.max(0, buyKwh + hw.electricityKwh) : buyKwh;

  const initial = calcInitialCost(input);
  const subsidyTotal = totalSubsidyAmount(input, input.appliedSubsidyIds);
  const initialCostNet = Math.max(0, initial.total - subsidyTotal);

  // 1年目 光熱費
  const electricityCost = buyKwhAfterEneFarm * input.electricityPriceBuy;
  const gasCost = hw.gasM3 * input.gasPrice;
  const sellRevenueY1 = surplusKwh * input.sellPriceFit;
  const firstYearEnergyCost = electricityCost + gasCost - sellRevenueY1;

  // 年次キャッシュフロー
  const riseRate = ELECTRICITY_RISE_RATES[input.electricityRise] / 100;
  const years = Math.max(1, input.livingYears);
  const yearly: YearlyEntry[] = [];
  let cumulative = initialCostNet;
  for (let y = 0; y < years; y++) {
    const priceFactor = Math.pow(1 + riseRate, y);
    const buyCost = buyKwhAfterEneFarm * input.electricityPriceBuy * priceFactor;
    const gasCostY = hw.gasM3 * input.gasPrice * priceFactor;
    const sellPrice = y < FIT_YEARS ? input.sellPriceFit : input.sellPricePostFit;
    const sellRev = surplusKwh * sellPrice;
    const yearCost = buyCost + gasCostY - sellRev;
    cumulative += yearCost;
    yearly.push({ year: y, energyCost: yearCost, cumulative });
  }

  // CO2: 標準シナリオとの差で出すため、ここでは「絶対の年間 CO2」を返し、後で差分計算
  const annualCo2 = calcAnnualCo2(buyKwhAfterEneFarm, hw.gasM3);

  return {
    scenarioId,
    scenarioName,
    initialCostGross: initial.total,
    subsidyTotal,
    initialCostNet,
    initialCostDelta: 0, // 後で baseline と比較して埋める
    annualHeatingKwh: heat.totalEnergyKwh,
    annualHotWaterKwh: Math.max(0, hw.electricityKwh),
    annualHotWaterGas: hw.gasM3,
    annualOtherKwh: other,
    annualSolarKwh: solar.annualKwh,
    selfConsumptionRate: sc.selfConsumptionRate,
    firstYearEnergyCost,
    firstYearSellRevenue: sellRevenueY1,
    yearly,
    cumulativeTotal: cumulative,
    annualCo2Reduction: -annualCo2, // tmp: store -annualCo2; baseline subtraction comes later
    cumulativeCo2Reduction: 0,
  };
}

/** 複数シナリオを計算し、baseline 比の差分を埋め込む */
export function runSimulation(input: HousingInput, scenarios: Scenario[]): SimulationOutput {
  const baselineId = baselineIdFor(input);
  // baseline を必ず先頭に組み込む
  const hasBaseline = scenarios.some((s) => s.id === baselineId);
  const baselineScenario =
    input.mode === "renovation"
      ? buildRenovationAsIsScenario(input)
      : buildBaselineScenario(input);
  const allScenarios = hasBaseline ? scenarios : [baselineScenario, ...scenarios];

  const calculated = allScenarios.map((s) => calcOneScenario(s.input, s.id, s.name));
  const baseline = calculated.find((r) => r.scenarioId === baselineId)!;

  // baseline の絶対 CO2 (= -annualCo2Reduction として一時格納していた)
  const baselineAnnualCo2 = -baseline.annualCo2Reduction;

  for (const r of calculated) {
    const absCo2 = -r.annualCo2Reduction;
    r.annualCo2Reduction = baselineAnnualCo2 - absCo2;
    r.cumulativeCo2Reduction = r.annualCo2Reduction * input.livingYears;
    r.initialCostDelta = r.initialCostNet - baseline.initialCostNet;
  }

  // 投資回収年数: scenario の累計が baseline の累計を下回る最初の年
  const paybackYears: Record<string, number> = {};
  const baselineYearly = baseline.yearly;
  for (const r of calculated) {
    if (r.scenarioId === baseline.scenarioId) {
      paybackYears[r.scenarioId] = 0;
      continue;
    }
    let payback = Infinity;
    for (let i = 0; i < r.yearly.length; i++) {
      const diff = r.yearly[i].cumulative - baselineYearly[i].cumulative;
      if (diff <= 0) {
        // 線形補間で前年との交点を求める
        if (i === 0) {
          payback = 0;
        } else {
          const prevDiff = r.yearly[i - 1].cumulative - baselineYearly[i - 1].cumulative;
          const span = prevDiff - diff;
          payback = i + (span === 0 ? 0 : -prevDiff / span);
        }
        break;
      }
    }
    paybackYears[r.scenarioId] = payback;
  }

  const assumptions: AssumptionSnapshot = {
    co2EmissionFactorElectricity: CO2_EMISSION_FACTOR_ELECTRICITY,
    co2EmissionFactorGas: CO2_EMISSION_FACTOR_GAS,
    solarLossFactor: SOLAR_LOSS_FACTOR,
    otherKwhPerPersonYear: OTHER_KWH_PER_PERSON_YEAR,
    electricityRisePercent: ELECTRICITY_RISE_RATES[input.electricityRise],
    fitYears: FIT_YEARS,
  };
  void GAS_KWH_PER_M3; // referenced via hotWater module
  void SOLAR_COST_PER_KW; // referenced via cost module
  return {
    inputAtCalc: input,
    scenarios: calculated,
    baselineId: baseline.scenarioId,
    paybackYears,
    assumptions,
  };
}
