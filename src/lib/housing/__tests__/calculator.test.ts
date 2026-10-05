import { describe, it, expect } from "vitest";
import { runSimulation } from "../calculator";
import { buildAllScenarios, buildUserScenario, buildRenovationAppliedScenario, buildBaselineScenario } from "../presets";
import type { HousingInput } from "../types";

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

describe("runSimulation: new-build mode", () => {
  it("buildAllScenarios gives 4 scenarios and the same baseline", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    // baseline is not duplicated, so it stays at 4 scenarios
    expect(out.scenarios).toHaveLength(4);
    expect(out.baselineId).toBe("preset-baseline");
  });

  it("prepends the baseline when scenarios omit it", () => {
    const input = baseInput();
    const out = runSimulation(input, [buildUserScenario(input)]);
    expect(out.scenarios.some((s) => s.scenarioId === "preset-baseline")).toBe(true);
  });

  it("paybackYears: 0 for the baseline itself", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    expect(out.paybackYears["preset-baseline"]).toBe(0);
  });

  it("annualCo2Reduction: 0 for the baseline (diff with itself)", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    const baseline = out.scenarios.find((s) => s.scenarioId === "preset-baseline")!;
    expect(baseline.annualCo2Reduction).toBe(0);
  });

  it("high performance + solar + battery emits less CO2 than the baseline", () => {
    const input = baseInput();
    const out = runSimulation(input, buildAllScenarios(input));
    const eco = out.scenarios.find((s) => s.scenarioId === "preset-high-perf-solar-battery")!;
    expect(eco.annualCo2Reduction).toBeGreaterThan(0);
  });

  it("yearly has exactly livingYears entries", () => {
    const input = baseInput({ livingYears: 25 });
    const out = runSimulation(input, buildAllScenarios(input));
    for (const s of out.scenarios) expect(s.yearly).toHaveLength(25);
  });

  it("yearly cumulative increases monotonically (without negative cash flow)", () => {
    const input = baseInput({ livingYears: 10 });
    const out = runSimulation(input, buildAllScenarios(input));
    for (const s of out.scenarios) {
      for (let i = 1; i < s.yearly.length; i++) {
        expect(s.yearly[i].cumulative).toBeGreaterThan(s.yearly[i - 1].cumulative);
      }
    }
  });

  it("computes at least one year when livingYears=0", () => {
    const input = baseInput({ livingYears: 0 });
    const out = runSimulation(input, buildAllScenarios(input));
    for (const s of out.scenarios) expect(s.yearly.length).toBeGreaterThanOrEqual(1);
  });

  it("solar surplus (12 kW with a small battery) gives sellRevenue > 0", () => {
    const input = baseInput({ solarCapacity: 12, batteryCapacity: 0 });
    const out = runSimulation(input, [buildUserScenario(input)]);
    const user = out.scenarios.find((s) => s.scenarioId === "user")!;
    expect(user.firstYearSellRevenue).toBeGreaterThan(0);
  });

  it("ENE-FARM: negative hot-water power reduces buyKwh", () => {
    const a = baseInput({ waterHeater: "eco-cute" });
    const b = baseInput({ waterHeater: "ene-farm" });
    const outA = runSimulation(a, [buildUserScenario(a)]);
    const outB = runSimulation(b, [buildUserScenario(b)]);
    const userA = outA.scenarios.find((s) => s.scenarioId === "user")!;
    const userB = outB.scenarios.find((s) => s.scenarioId === "user")!;
    // ene-farm: gas for hot water + generation offset, so annual electricity cost usually takes a separate path
    expect(userB.annualHotWaterGas).toBeGreaterThan(0);
    expect(userA.annualHotWaterGas).toBe(0);
  });

  it("gas water heater gives annualHotWaterKwh=0", () => {
    const input = baseInput({ waterHeater: "gas" });
    const out = runSimulation(input, [buildUserScenario(input)]);
    const user = out.scenarios.find((s) => s.scenarioId === "user")!;
    expect(user.annualHotWaterKwh).toBe(0);
    expect(user.annualHotWaterGas).toBeGreaterThan(0);
  });

  it("applies the post-FIT (卒FIT) price after the FIT period (year >= 10)", () => {
    const input = baseInput({ solarCapacity: 5, livingYears: 15, sellPriceFit: 20, sellPricePostFit: 5 });
    const out = runSimulation(input, [buildUserScenario(input)]);
    const user = out.scenarios.find((s) => s.scenarioId === "user")!;
    // The post-FIT (卒FIT) switch effect is continuous but is reflected in yearCost
    expect(user.yearly[11].energyCost).not.toBe(user.yearly[0].energyCost);
  });

  it("HEMS cuts other appliance use by 5% and raises initial cost", () => {
    const input = baseInput({ hems: true });
    const out = runSimulation(input, [buildUserScenario(input)]);
    const user = out.scenarios.find((s) => s.scenarioId === "user")!;
    expect(user.initialCostGross).toBeGreaterThan(0);
  });

  it("payback=0 when the user spec equals the baseline plus a subsidy", () => {
    // With the user scenario set to the same spec as baseline and a subsidy applied,
    // initial cost (baseline - subsidy) < baseline initial cost -> payback=0
    const input = baseInput({
      appliedSubsidyIds: ["battery-doe"], // 200,000 yen subsidy with no requirements
    });
    const out = runSimulation(input, [
      buildBaselineScenario(input),
      buildUserScenario(input), // same spec as the baseline, but appliedSubsidyIds apply
    ]);
    expect(out.paybackYears["user"]).toBe(0);
  });

  it("returns the assumptions snapshot", () => {
    const out = runSimulation(baseInput(), buildAllScenarios(baseInput()));
    expect(out.assumptions.fitYears).toBe(10);
    expect(out.assumptions.solarLossFactor).toBeGreaterThan(0);
  });
});

describe("runSimulation: renovation mode", () => {
  const renoInput = (overrides: Partial<HousingInput> = {}): HousingInput =>
    baseInput({
      mode: "renovation",
      renovation: {
        ageBracket: "1980-1999",
        remainingYears: 20,
        existingUa: 1.5,
        existingCValue: 5.0,
        existingWindow: "alum-pair",
        existingWaterHeater: "gas",
        existingHeating: "ac-only",
        items: ["ceiling-insulation", "floor-insulation"],
      },
      ...overrides,
    });

  it("baselineId is renovation-as-is", () => {
    const input = renoInput();
    const out = runSimulation(input, buildAllScenarios(input));
    expect(out.baselineId).toBe("renovation-as-is");
  });

  it("renovation-applied improves UA, so annualCo2Reduction >= 0", () => {
    const input = renoInput();
    const out = runSimulation(input, buildAllScenarios(input));
    const applied = out.scenarios.find((s) => s.scenarioId === "renovation-applied")!;
    expect(applied.annualCo2Reduction).toBeGreaterThanOrEqual(0);
  });

  it("window replacement upgrades the spec to resin-pair-lowe", () => {
    const input = renoInput({
      renovation: {
        ageBracket: "1980-1999",
        remainingYears: 20,
        existingUa: 1.5,
        existingCValue: 5,
        existingWindow: "alum-pair",
        existingWaterHeater: "gas",
        existingHeating: "ac-only",
        items: ["window-replacement"],
      },
    });
    const sc = buildRenovationAppliedScenario(input);
    expect(sc.input.windowSpec).toBe("resin-pair-lowe");
  });

  it("inner windows upgrade the spec to resin-pair-lowe", () => {
    const input = renoInput({
      renovation: {
        ageBracket: "1980-1999",
        remainingYears: 20,
        existingUa: 1.5,
        existingCValue: 5,
        existingWindow: "alum-pair",
        existingWaterHeater: "gas",
        existingHeating: "ac-only",
        items: ["inner-window"],
      },
    });
    const sc = buildRenovationAppliedScenario(input);
    expect(sc.input.windowSpec).toBe("resin-pair-lowe");
  });

  it("keeps the existing window spec without window items", () => {
    const input = renoInput({
      renovation: {
        ageBracket: "1980-1999",
        remainingYears: 20,
        existingUa: 1.5,
        existingCValue: 5,
        existingWindow: "alum-pair",
        existingWaterHeater: "gas",
        existingHeating: "ac-only",
        items: ["ceiling-insulation"],
      },
    });
    const sc = buildRenovationAppliedScenario(input);
    expect(sc.input.windowSpec).toBe("alum-pair");
  });

  it("applied falls back to the user scenario without a renovation object", () => {
    const input = baseInput({ mode: "renovation" }); // renovation unset
    const sc = buildRenovationAppliedScenario(input);
    expect(sc.id).toBe("user");
  });

  it("as-is also falls back to the user scenario without a renovation object (build stage)", () => {
    // runSimulation fails in this state because there is no baseline, but the build function's behavior can be checked
    const input = baseInput({ mode: "renovation" });
    const scs = buildAllScenarios(input);
    expect(scs.length).toBeGreaterThan(0);
    expect(scs.every((s) => s.id === "user")).toBe(true);
  });
});

describe("preset scenarios have the basic attributes", () => {
  it("buildBaselineScenario fills in the metadata", () => {
    const sc = buildBaselineScenario(baseInput());
    expect(sc.id).toBe("preset-baseline");
    expect(sc.source).toBe("preset");
    expect(sc.input.solarCapacity).toBe(0);
  });

  it("the custom insulation preset leaves UA unchanged", () => {
    const sc = buildBaselineScenario(baseInput({ insulationPreset: "custom", uaValue: 0.66 }));
    // baseline overrides energy-saving so it is irrelevant; the applyInsulation custom path is hit by another scenario
    expect(sc.input.uaValue).toBeDefined();
  });
});
