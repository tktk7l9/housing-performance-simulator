// Overall assessment logic for simulation results
//
// Scores "economy / environment / energy independence" with rules and
// returns a total score (0-100), a grade from SS to D, and a text summary.
//
// For neutrality, coefficients and scoring thresholds are gathered as constants at the top of this file
// so the UI (EvaluationCard) can present them as the basis of the calculation.

import type { ScenarioResult, SimulationOutput, SimulationMode } from "./types";

/** Weights: economy 60 / environment 25 / independence 15 = 100 */
export const WEIGHTS = {
  economy: 60,
  environment: 25,
  autonomy: 15,
} as const;

/** Economy breakdown: cumulative cost reduction 40 + payback 20 */
const ECONOMY_COST_MAX = 40;
const ECONOMY_PAYBACK_MAX = 20;

/** Designed so a 20% cumulative cost reduction reaches the full 40 economy points */
const COST_SAVING_FULL_RATIO = 0.20;

/** Designed so a CO2 reduction of 5000 kg/year reaches the full 25 environment points */
const CO2_FULL_REDUCTION_KG_PER_YEAR = 5000;

export interface EvaluationBreakdown {
  /** Economy 0..60 */
  economy: number;
  /** Environment 0..25 */
  environment: number;
  /** Independence 0..15 */
  autonomy: number;
  /** Part of economy: cumulative cost reduction 0..40 */
  economyCost: number;
  /** Part of economy: payback 0..20 */
  economyPayback: number;
}

export type Grade = "S" | "A" | "B" | "C" | "D";

export interface Evaluation {
  /** 0..100 */
  score: number;
  grade: Grade;
  headline: string;
  strengths: string[];
  cautions: string[];
  breakdown: EvaluationBreakdown;
  /** Scenario being evaluated (the user's choice) */
  targetScenarioName: string;
  /** Baseline scenario for comparison */
  baselineScenarioName: string;
  /** Payback year (target) — may be Infinity / 0 */
  paybackYears: number;
  /** Cumulative cost difference (baseline - target, positive means gain), yen */
  cumulativeDelta: number;
}

const TARGET_ID_BY_MODE = (mode: SimulationMode) =>
  mode === "renovation" ? "renovation-applied" : "user";

function pickTarget(output: SimulationOutput): ScenarioResult | undefined {
  const targetId = TARGET_ID_BY_MODE(output.inputAtCalc.mode);
  return output.scenarios.find((s) => s.scenarioId === targetId);
}

function gradeFromScore(score: number): Grade {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

function calcEconomyScores(
  target: ScenarioResult,
  baseline: ScenarioResult,
  livingYears: number,
  payback: number
): { cost: number; payback: number } {
  // 1) Cumulative cost reduction
  const baseTotal = Math.max(1, baseline.cumulativeTotal);
  const ratio = (baseline.cumulativeTotal - target.cumulativeTotal) / baseTotal;
  const cost = Math.max(
    0,
    Math.min(ECONOMY_COST_MAX, (ratio / COST_SAVING_FULL_RATIO) * ECONOMY_COST_MAX)
  );

  // 2) Payback (earlier scores higher)
  let paybackScore = 0;
  if (target.scenarioId === baseline.scenarioId) {
    paybackScore = ECONOMY_PAYBACK_MAX; // baseline itself: no investment = treated as full score
  } else if (Number.isFinite(payback) && payback >= 0) {
    const halfLife = livingYears * 0.4;
    if (payback <= halfLife) {
      paybackScore = ECONOMY_PAYBACK_MAX;
    } else if (payback <= livingYears) {
      const t = (payback - halfLife) / (livingYears - halfLife);
      paybackScore = ECONOMY_PAYBACK_MAX * (1 - t);
    } else {
      paybackScore = 0;
    }
  } else {
    // Never pays back (Infinity) but the cumulative difference is positive (better than baseline without investment) -> small simple bonus
    paybackScore = baseline.cumulativeTotal - target.cumulativeTotal > 0 ? 8 : 0;
  }
  return { cost, payback: paybackScore };
}

function calcEnvironment(target: ScenarioResult): number {
  const co2 = Math.max(0, target.annualCo2Reduction);
  return Math.min(WEIGHTS.environment, (co2 / CO2_FULL_REDUCTION_KG_PER_YEAR) * WEIGHTS.environment);
}

function calcAutonomy(target: ScenarioResult, solarCapacity: number): number {
  // Self-consumption rate 0..10 + solar kW (full score at 5kW cap) 0..5
  const sc = Math.max(0, Math.min(1, target.selfConsumptionRate));
  const sol = Math.max(0, Math.min(5, solarCapacity));
  return Math.min(WEIGHTS.autonomy, sc * 10 + sol);
}

function generateHeadline(grade: Grade, mode: SimulationMode): string {
  if (mode === "renovation") {
    switch (grade) {
      case "S":
        return "現状維持より大きく得。優先順位の高いリフォーム項目が揃っています。";
      case "A":
        return "経済合理性の高いリフォーム計画です。長期で見て十分回収できる見込み。";
      case "B":
        return "ほぼ妥当な計画。費用対効果を底上げできる項目があるか再検討の余地あり。";
      case "C":
        return "投資が居住年数内で回収しきれない可能性。優先項目を絞ると効率が上がります。";
      case "D":
        return "現状維持より高くなる試算です。光熱費削減効果が初期費用を上回りません。";
    }
  }
  switch (grade) {
    case "S":
      return "標準仕様より大きく得。環境性能・自立性ともに高水準です。";
    case "A":
      return "30 年スパンで明確に得。投資回収も早く、合理的な選択です。";
    case "B":
      return "おおむね妥当な選択。仕様の追加や入替で経済性をさらに高められます。";
    case "C":
      return "投資が居住年数内で回収しきれない可能性があります。";
    case "D":
      return "現在の選択は経済合理性が低い試算結果です。仕様の見直しを推奨します。";
  }
}

function generateStrengths(
  target: ScenarioResult,
  baseline: ScenarioResult,
  livingYears: number,
  payback: number,
  breakdown: EvaluationBreakdown
): string[] {
  const list: string[] = [];
  const cumDelta = baseline.cumulativeTotal - target.cumulativeTotal;
  if (cumDelta > 0) {
    list.push(
      `${livingYears} 年で累計 ${(cumDelta / 10000).toFixed(0)} 万円の削減（基準比）`
    );
  }
  if (Number.isFinite(payback) && payback > 0 && payback <= livingYears) {
    list.push(`投資回収 ${payback.toFixed(1)} 年（居住年数 ${livingYears} 年内）`);
  }
  if (breakdown.environment >= WEIGHTS.environment * 0.6) {
    list.push(`年間 CO2 削減 ${Math.round(target.annualCo2Reduction).toLocaleString()} kg`);
  }
  if (breakdown.autonomy >= WEIGHTS.autonomy * 0.6) {
    list.push(
      `自家消費率 ${Math.round(target.selfConsumptionRate * 100)}% でエネルギー自立性が高い`
    );
  }
  return list.slice(0, 3);
}

function generateCautions(
  target: ScenarioResult,
  baseline: ScenarioResult,
  livingYears: number,
  payback: number,
  breakdown: EvaluationBreakdown
): string[] {
  const list: string[] = [];
  const cumDelta = baseline.cumulativeTotal - target.cumulativeTotal;
  if (cumDelta < 0) {
    list.push(
      `${livingYears} 年で基準より ${(Math.abs(cumDelta) / 10000).toFixed(0)} 万円高い試算`
    );
  }
  if (!Number.isFinite(payback) || payback > livingYears) {
    if (target.initialCostDelta > 0) {
      list.push(`居住年数内では初期費用を回収しきれません`);
    }
  }
  if (breakdown.environment < WEIGHTS.environment * 0.3 && target.scenarioId !== baseline.scenarioId) {
    list.push(`CO2 削減効果が限定的（年間 ${Math.round(target.annualCo2Reduction).toLocaleString()} kg）`);
  }
  if (target.initialCostDelta > 3_000_000) {
    list.push(
      `初期費用の差額 ${(target.initialCostDelta / 10000).toFixed(0)} 万円を捻出する資金計画が必要`
    );
  }
  return list.slice(0, 2);
}

export function evaluateResult(output: SimulationOutput): Evaluation | null {
  const target = pickTarget(output);
  const baseline = output.scenarios.find((s) => s.scenarioId === output.baselineId);
  if (!target || !baseline) return null;

  const livingYears = Math.max(1, output.inputAtCalc.livingYears);
  const payback = output.paybackYears[target.scenarioId];

  const econ = calcEconomyScores(target, baseline, livingYears, payback);
  const economy = econ.cost + econ.payback;
  const environment = calcEnvironment(target);
  const autonomy = calcAutonomy(target, output.inputAtCalc.solarCapacity);

  const breakdown: EvaluationBreakdown = {
    economy: Math.round(economy),
    environment: Math.round(environment),
    autonomy: Math.round(autonomy),
    economyCost: Math.round(econ.cost),
    economyPayback: Math.round(econ.payback),
  };
  const score = Math.max(0, Math.min(100, Math.round(economy + environment + autonomy)));
  const grade = gradeFromScore(score);

  return {
    score,
    grade,
    headline: generateHeadline(grade, output.inputAtCalc.mode),
    strengths: generateStrengths(target, baseline, livingYears, payback, breakdown),
    cautions: generateCautions(target, baseline, livingYears, payback, breakdown),
    breakdown,
    targetScenarioName: target.scenarioName,
    baselineScenarioName: baseline.scenarioName,
    paybackYears: payback,
    cumulativeDelta: baseline.cumulativeTotal - target.cumulativeTotal,
  };
}
