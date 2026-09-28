// Scenario calculation orchestrator
//
// Input -> (building heat load + hot water + solar + battery + other appliances) -> annual utility cost
// -> yearly accumulation (electricity price rise, FIT/post-FIT applied) -> cumulative cost and CO2

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

/** One-off calculation of a single scenario */
function calcOneScenario(input: HousingInput, scenarioId: string, scenarioName: string): ScenarioResult {
  const heat = calcHeatLoad(input);
  const hw = calcHotWater(input);
  const solar = calcSolar(input);
  const sc = calcSelfConsumption(input);
  const other = OTHER_KWH_PER_PERSON_YEAR * input.household * (input.hems ? 0.95 : 1.0);

  // Annual household electricity consumption (total consumption without solar)
  const totalConsumeKwh = heat.totalEnergyKwh + Math.max(0, hw.electricityKwh) + other;

  // Self-consumption is capped at total household consumption; the excess is sold as surplus
  // (otherwise generation that cannot be used is left unaccounted for and feed-in revenue is understated)
  const rawSelfConsume = solar.annualKwh * sc.selfConsumptionRate;
  const selfConsumeKwh = Math.min(rawSelfConsume, totalConsumeKwh);
  const surplusKwh = Math.max(0, solar.annualKwh - selfConsumeKwh);
  const buyKwh = Math.max(0, totalConsumeKwh - selfConsumeKwh);

  // When hot water offsets electricity (negative value), e.g. with Ene-Farm, reduce purchased power further
  const buyKwhAfterEneFarm = hw.electricityKwh < 0 ? Math.max(0, buyKwh + hw.electricityKwh) : buyKwh;

  const initial = calcInitialCost(input);
  const subsidyTotal = totalSubsidyAmount(input, input.appliedSubsidyIds);
  const initialCostNet = Math.max(0, initial.total - subsidyTotal);

  // Year-1 utility cost
  const electricityCost = buyKwhAfterEneFarm * input.electricityPriceBuy;
  const gasCost = hw.gasM3 * input.gasPrice;
  const sellRevenueY1 = surplusKwh * input.sellPriceFit;
  const firstYearEnergyCost = electricityCost + gasCost - sellRevenueY1;

  // Yearly cash flow
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

  // CO2: derived as the difference from the standard scenario, so return absolute annual CO2 here and diff later
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

/** Calculate multiple scenarios and embed the differences against baseline */
export function runSimulation(input: HousingInput, scenarios: Scenario[]): SimulationOutput {
  const baselineId = baselineIdFor(input);
  // Always put baseline first
  const hasBaseline = scenarios.some((s) => s.id === baselineId);
  const baselineScenario =
    input.mode === "renovation"
      ? buildRenovationAsIsScenario(input)
      : buildBaselineScenario(input);
  const allScenarios = hasBaseline ? scenarios : [baselineScenario, ...scenarios];

  const calculated = allScenarios.map((s) => calcOneScenario(s.input, s.id, s.name));
  const baseline = calculated.find((r) => r.scenarioId === baselineId)!;

  // Absolute CO2 of baseline (temporarily stored as -annualCo2Reduction)
  const baselineAnnualCo2 = -baseline.annualCo2Reduction;

  for (const r of calculated) {
    const absCo2 = -r.annualCo2Reduction;
    r.annualCo2Reduction = baselineAnnualCo2 - absCo2;
    r.cumulativeCo2Reduction = r.annualCo2Reduction * input.livingYears;
    r.initialCostDelta = r.initialCostNet - baseline.initialCostNet;
  }

  // Payback years: the first year in which the scenario's cumulative total falls below baseline's
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
        // Find the crossing point with the previous year by linear interpolation
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
