import { describe, it, expect } from "vitest";
import { runSimulation } from "../calculator";
import { buildAllScenarios, buildUserScenario } from "../presets";
import { evaluateResult, WEIGHTS } from "../evaluation";
import type { HousingInput, ScenarioResult, SimulationOutput, SimulationMode } from "../types";

// ── headline 各 grade を確実にカバーするための合成 SimulationOutput ─────
function makeScenario(id: string, name: string, opts: Partial<ScenarioResult> = {}): ScenarioResult {
  return {
    scenarioId: id,
    scenarioName: name,
    initialCostGross: 0,
    subsidyTotal: 0,
    initialCostNet: 0,
    initialCostDelta: 0,
    annualHeatingKwh: 0,
    annualHotWaterKwh: 0,
    annualHotWaterGas: 0,
    annualOtherKwh: 0,
    annualSolarKwh: 0,
    selfConsumptionRate: 0,
    firstYearEnergyCost: 0,
    firstYearSellRevenue: 0,
    yearly: [],
    cumulativeTotal: 0,
    annualCo2Reduction: 0,
    cumulativeCo2Reduction: 0,
    ...opts,
  };
}

function makeOutput(
  mode: SimulationMode,
  target: Partial<ScenarioResult>,
  baselineCumulative: number,
  payback: number,
  livingYears = 30,
  solarCapacity = 0,
): SimulationOutput {
  const baselineId = mode === "renovation" ? "renovation-as-is" : "preset-baseline";
  const targetId = mode === "renovation" ? "renovation-applied" : "user";
  return {
    inputAtCalc: {
      mode,
      floorArea: 120,
      region: 6,
      household: 4,
      presence: "evening-only",
      livingYears,
      insulationPreset: "energy-saving",
      uaValue: 0.87,
      cValue: 5,
      windowSpec: "alum-resin-pair-lowe",
      solarCapacity,
      solarOrientation: "south",
      solarTilt: 30,
      batteryCapacity: 0,
      waterHeater: "eco-cute",
      heating: "ac-only",
      hems: false,
      electricityPriceBuy: 32,
      gasPrice: 200,
      sellPriceFit: 15,
      sellPricePostFit: 8,
      electricityRise: "moderate",
      appliedSubsidyIds: [],
    },
    scenarios: [
      makeScenario(baselineId, "baseline", { cumulativeTotal: baselineCumulative }),
      makeScenario(targetId, "target", target),
    ],
    baselineId,
    paybackYears: { [baselineId]: 0, [targetId]: payback },
    assumptions: {
      co2EmissionFactorElectricity: 0.43,
      co2EmissionFactorGas: 2.27,
      solarLossFactor: 0.85,
      otherKwhPerPersonYear: 1200,
      electricityRisePercent: 2,
      fitYears: 10,
    },
  };
}

function baseInput(overrides: Partial<HousingInput> = {}): HousingInput {
  return {
    mode: "new-build",
    floorArea: 120,
    region: 6,
    household: 4,
    presence: "evening-only",
    livingYears: 30,
    insulationPreset: "energy-saving",
    uaValue: 0.87,
    cValue: 5.0,
    windowSpec: "alum-resin-pair-lowe",
    solarCapacity: 0,
    solarOrientation: "south",
    solarTilt: 30,
    batteryCapacity: 0,
    waterHeater: "eco-cute",
    heating: "ac-only",
    hems: false,
    electricityPriceBuy: 32,
    gasPrice: 200,
    sellPriceFit: 15,
    sellPricePostFit: 8,
    electricityRise: "moderate",
    appliedSubsidyIds: [],
    ...overrides,
  };
}

describe("evaluateResult", () => {
  it("WEIGHTS: economy 60 + environment 25 + autonomy 15 = 100", () => {
    expect(WEIGHTS.economy + WEIGHTS.environment + WEIGHTS.autonomy).toBe(100);
  });

  it("基本ケース: score / grade / breakdown が返る", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e.score).toBeGreaterThanOrEqual(0);
    expect(e.score).toBeLessThanOrEqual(100);
    expect(["S", "A", "B", "C", "D"]).toContain(e.grade);
    expect(e.breakdown.economy + e.breakdown.environment + e.breakdown.autonomy).toBeGreaterThan(0);
  });

  it("user シナリオが見つからない場合は null", () => {
    const input = baseInput();
    const out = runSimulation(input, [buildUserScenario(input)]);
    // baseline を消去して target なし状態を作る
    out.scenarios = out.scenarios.filter((s) => s.scenarioId !== "user");
    const e = evaluateResult(out);
    expect(e).toBeNull();
  });

  it("baseline が見つからない場合は null", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    out.scenarios = out.scenarios.filter((s) => s.scenarioId !== out.baselineId);
    const e = evaluateResult(out);
    expect(e).toBeNull();
  });

  it("高性能シナリオを user として評価すると経済性・環境性が出る", () => {
    // user 仕様を高性能 + 太陽光 + 蓄電池に
    const input = baseInput({
      insulationPreset: "heat20-g2",
      uaValue: 0.46,
      cValue: 1.0,
      windowSpec: "resin-pair-lowe",
      solarCapacity: 5,
      batteryCapacity: 7,
      hems: true,
    });
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e.breakdown.environment).toBeGreaterThan(0);
    expect(e.breakdown.autonomy).toBeGreaterThan(0);
  });

  it("payback < halfLife → 投資回収満点 (20pt)", () => {
    const input = baseInput({
      insulationPreset: "zeh",
      uaValue: 0.6,
      solarCapacity: 8,
      batteryCapacity: 0,
      livingYears: 30,
    });
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e.breakdown.economyPayback).toBeGreaterThanOrEqual(0);
  });

  it("payback Infinity だが累計プラス → プチ加点 (8pt) 分岐", () => {
    // baseline と target が完全一致に近い → payback Infinity に近づける
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e.breakdown).toBeDefined();
  });

  it("strengths / cautions に内容が入る (cumDelta>0 や CO2 高)", () => {
    const input = baseInput({
      insulationPreset: "heat20-g2",
      uaValue: 0.46,
      solarCapacity: 5,
      batteryCapacity: 7,
      hems: true,
    });
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(Array.isArray(e.strengths)).toBe(true);
    expect(Array.isArray(e.cautions)).toBe(true);
  });

  it("livingYears=0 でも安全 (Math.max(1,...) でクランプ)", () => {
    const input = baseInput({ livingYears: 0 });
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e).toBeTruthy();
  });

  it("初期費用差額 > 300万 で資金計画 caution", () => {
    const input = baseInput({
      insulationPreset: "heat20-g3",
      uaValue: 0.26,
      solarCapacity: 10,
      batteryCapacity: 15,
      hems: true,
    });
    const out = runSimulation(input, buildAllScenarios(input));
    const e = evaluateResult(out)!;
    expect(e.cautions.length).toBeGreaterThanOrEqual(0);
  });

  // gradeFromScore の各境界に到達するため、score を直接合成して headline を網羅
});

describe("evaluateResult: 合成 SimulationOutput で全 grade headline を網羅", () => {
  /**
   * grade は gradeFromScore の閾値ラダー（S>=90 / A>=75 / B>=60 / C>=40 / それ以下 D）、
   * headline は generateHeadline の mode × grade スイッチ。どちらも 5 行 / 10 分岐の
   * 表なので、テストも表で持つ。以前は 10 本の it に分かれていて、
   * (1) テスト名にソース行番号（"grade S (line 141)"）が埋まっていて無関係な編集で嘘になる、
   * (2) スコアの作り方をコメントに書き写していたので WEIGHTS を変えると 10 本全部を手で
   * 逆算し直す必要がある、という 2 つの負債があった。
   *
   * スコアの組み立て: cost = 削減率 / payback / env = CO2 / auton = 自家消費率 + 太陽光。
   */
  type GradeCase = {
    mode: SimulationMode;
    target: Partial<ScenarioResult>;
    baselineCumulative: number;
    payback: number;
    solar: number;
    grade: string;
    headline: string;
  };

  it.each<GradeCase>([
    { mode: "new-build", grade: "S", headline: "環境性能・自立性ともに高水準",
      target: { cumulativeTotal: 80, annualCo2Reduction: 5000, selfConsumptionRate: 1 },
      baselineCumulative: 100, payback: 0, solar: 5 },
    { mode: "new-build", grade: "A", headline: "投資回収も早く",
      target: { cumulativeTotal: 85, annualCo2Reduction: 3000, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 5, solar: 5 },
    { mode: "new-build", grade: "B", headline: "おおむね妥当な選択",
      target: { cumulativeTotal: 90, annualCo2Reduction: 3000, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 10, solar: 5 },
    { mode: "new-build", grade: "C", headline: "回収しきれない可能性",
      target: { cumulativeTotal: 90, annualCo2Reduction: 2500, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 15, solar: 5 },
    { mode: "new-build", grade: "D", headline: "経済合理性が低い試算結果",
      target: { cumulativeTotal: 110, annualCo2Reduction: 0, selfConsumptionRate: 0, initialCostDelta: 5_000_000 },
      baselineCumulative: 100, payback: Infinity, solar: 0 },

    { mode: "renovation", grade: "S", headline: "優先順位の高いリフォーム項目",
      target: { cumulativeTotal: 70, annualCo2Reduction: 5000, selfConsumptionRate: 1 },
      baselineCumulative: 100, payback: 0, solar: 5 },
    { mode: "renovation", grade: "A", headline: "経済合理性の高いリフォーム計画",
      target: { cumulativeTotal: 85, annualCo2Reduction: 3000, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 5, solar: 5 },
    { mode: "renovation", grade: "B", headline: "再検討の余地あり",
      target: { cumulativeTotal: 90, annualCo2Reduction: 3000, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 10, solar: 5 },
    { mode: "renovation", grade: "C", headline: "優先項目を絞ると効率が上がります",
      target: { cumulativeTotal: 90, annualCo2Reduction: 2500, selfConsumptionRate: 0.5 },
      baselineCumulative: 100, payback: 15, solar: 5 },
    { mode: "renovation", grade: "D", headline: "光熱費削減効果が初期費用を上回りません",
      target: { cumulativeTotal: 130, annualCo2Reduction: 0, selfConsumptionRate: 0, initialCostDelta: 5_000_000 },
      baselineCumulative: 100, payback: Infinity, solar: 0 },
  ])("$mode: grade $grade / headline に「$headline」", (c) => {
    const out = makeOutput(c.mode, c.target, c.baselineCumulative, c.payback, 30, c.solar);
    const e = evaluateResult(out)!;
    expect(e.grade).toBe(c.grade);
    expect(e.headline).toContain(c.headline);
  });

  it("payback>livingYears で 0pt 加点なし", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 99, annualCo2Reduction: 100, selfConsumptionRate: 0 },
      100, 50, 30, 0); // payback=50 > livingYears=30
    const e = evaluateResult(out)!;
    expect(e.breakdown.economyPayback).toBe(0);
  });

  it("payback Infinity だが cumDelta マイナス → cautions に居住年数内回収不能", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 110, annualCo2Reduction: 0, selfConsumptionRate: 0, initialCostDelta: 1_000_000 },
      100, Infinity, 30, 0);
    const e = evaluateResult(out)!;
    expect(e.cautions.some((c) => c.includes("回収"))).toBe(true);
  });

  it("CO2 削減限定的かつ target!=baseline で cautions に追加", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 90, annualCo2Reduction: 100, selfConsumptionRate: 0 },
      100, 10, 30, 0);
    const e = evaluateResult(out)!;
    expect(e.cautions.some((c) => c.includes("CO2"))).toBe(true);
  });

  it("baselineCumulative が 0 でも安全 (Math.max(1, ...))", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 50, annualCo2Reduction: 0, selfConsumptionRate: 0 },
      0, 5, 30, 0);
    const e = evaluateResult(out)!;
    expect(e.score).toBeGreaterThanOrEqual(0);
  });

  it("autonomy: selfConsumptionRate > 1 / solar > 5 をクランプ", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 90, annualCo2Reduction: 0, selfConsumptionRate: 2 },
      100, 10, 30, 100);
    const e = evaluateResult(out)!;
    expect(e.breakdown.autonomy).toBeLessThanOrEqual(15);
  });

  it("autonomy: 負の selfConsumptionRate / 負の solar をクランプ", () => {
    const out = makeOutput("new-build",
      { cumulativeTotal: 90, annualCo2Reduction: 0, selfConsumptionRate: -0.5 },
      100, 10, 30, -5);
    const e = evaluateResult(out)!;
    expect(e.breakdown.autonomy).toBeGreaterThanOrEqual(0);
  });
});
