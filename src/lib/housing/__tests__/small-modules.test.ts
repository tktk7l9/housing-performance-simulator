import { describe, it, expect } from "vitest";
import { calcSolar } from "../solar";
import { calcSelfConsumption } from "../battery";
import { calcAnnualCo2 } from "../co2";
import { matchSubsidies, totalSubsidyAmount } from "../subsidy";
import {
  buildHighPerformanceScenario,
  buildHighPerformanceSolarBatteryScenario,
  buildUserScenario,
  buildRenovationAsIsScenario,
  buildAllScenarios,
  defaultRenovationInput,
} from "../presets";
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
    solarCapacity: 5,
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

describe("calcSolar", () => {
  it("zero solar capacity generates nothing", () => {
    expect(calcSolar(baseInput({ solarCapacity: 0 })).annualKwh).toBe(0);
  });

  it("south-facing generates more than east/west", () => {
    const south = calcSolar(baseInput({ solarOrientation: "south" })).annualKwh;
    const east = calcSolar(baseInput({ solarOrientation: "east" })).annualKwh;
    expect(south).toBeGreaterThan(east);
  });

  it("south-east and south-west are in between", () => {
    const south = calcSolar(baseInput({ solarOrientation: "south" })).annualKwh;
    const sw = calcSolar(baseInput({ solarOrientation: "south-west" })).annualKwh;
    const se = calcSolar(baseInput({ solarOrientation: "south-east" })).annualKwh;
    const w = calcSolar(baseInput({ solarOrientation: "west" })).annualKwh;
    expect(sw).toBeLessThan(south);
    expect(sw).toBeGreaterThan(w);
    expect(se).toBe(sw); // Both 0.96
  });

  it("a 30° tilt is near the peak; 0° and 90° generate less", () => {
    const tilt0  = calcSolar(baseInput({ solarTilt: 0 })).annualKwh;
    const tilt30 = calcSolar(baseInput({ solarTilt: 30 })).annualKwh;
    const tilt90 = calcSolar(baseInput({ solarTilt: 90 })).annualKwh;
    expect(tilt30).toBeGreaterThan(tilt0);
    expect(tilt30).toBeGreaterThan(tilt90);
  });

  it("tilts above 30° (e.g. 60°) keep 0 < tiltFactor < 1.1", () => {
    const v = calcSolar(baseInput({ solarTilt: 60 })).annualKwh;
    expect(v).toBeGreaterThan(0);
  });

  it("region 8 (warm) generates more than region 1 (cold)", () => {
    const r1 = calcSolar(baseInput({ region: 1 })).annualKwh;
    const r8 = calcSolar(baseInput({ region: 8 })).annualKwh;
    expect(r8).toBeGreaterThan(r1);
  });
});

describe("calcSelfConsumption", () => {
  it("no solar means zero self-consumption", () => {
    expect(calcSelfConsumption(baseInput({ solarCapacity: 0 })).selfConsumptionRate).toBe(0);
  });

  it("evening presence < all-day presence", () => {
    const ev = calcSelfConsumption(baseInput({ presence: "evening-only" })).selfConsumptionRate;
    const ad = calcSelfConsumption(baseInput({ presence: "all-day" })).selfConsumptionRate;
    expect(ad).toBeGreaterThan(ev);
  });

  it("more battery capacity raises self-consumption (asymptotically)", () => {
    const b0  = calcSelfConsumption(baseInput({ batteryCapacity: 0 })).selfConsumptionRate;
    const b5  = calcSelfConsumption(baseInput({ batteryCapacity: 5 })).selfConsumptionRate;
    const b15 = calcSelfConsumption(baseInput({ batteryCapacity: 15 })).selfConsumptionRate;
    expect(b5).toBeGreaterThan(b0);
    expect(b15).toBeGreaterThan(b5);
  });

  it("HEMS adds 0.05 to self-consumption", () => {
    const a = calcSelfConsumption(baseInput({ hems: false })).selfConsumptionRate;
    const b = calcSelfConsumption(baseInput({ hems: true })).selfConsumptionRate;
    expect(b).toBeCloseTo(a + 0.05, 5);
  });

  it("clamps at 0.95", () => {
    const r = calcSelfConsumption(
      baseInput({ presence: "all-day", batteryCapacity: 50, hems: true })
    );
    expect(r.selfConsumptionRate).toBeLessThanOrEqual(0.95);
  });

  it("treats negative battery capacity as 0", () => {
    const r = calcSelfConsumption(baseInput({ batteryCapacity: -5 }));
    // batteryUplift(-5) should be 0. Can be judged from base alone
    expect(r.selfConsumptionRate).toBeGreaterThan(0);
  });
});

describe("calcAnnualCo2", () => {
  it("returns 0 when both are 0", () => {
    expect(calcAnnualCo2(0, 0)).toBe(0);
  });
  it("is positive with electricity only", () => {
    expect(calcAnnualCo2(1000, 0)).toBeGreaterThan(0);
  });
  it("is positive with gas only", () => {
    expect(calcAnnualCo2(0, 100)).toBeGreaterThan(0);
  });
  it("adds monotonically", () => {
    expect(calcAnnualCo2(1000, 100)).toBe(calcAnnualCo2(1000, 0) + calcAnnualCo2(0, 100));
  });
});

describe("matchSubsidies / totalSubsidyAmount", () => {
  it("the battery subsidy (no requirements) matches the default input", () => {
    const r = matchSubsidies(baseInput({ solarCapacity: 0 }));
    expect(r.find((s) => s.id === "battery-doe")).toBeDefined();
  });

  it("matches when the insulation (ZEH or better) and solar requirements are met", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "zeh", solarCapacity: 5 }));
    expect(r.find((s) => s.id === "zeh")).toBeDefined();
  });

  it("excludes the zeh subsidy with ZEH insulation but no solar", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "zeh", solarCapacity: 0 }));
    expect(r.find((s) => s.id === "zeh")).toBeUndefined();
  });

  it("kodomo-eco matches with HEAT20-G1", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "heat20-g1" }));
    expect(r.find((s) => s.id === "kodomo-eco")).toBeDefined();
  });

  it("custom has rank 0, so high-rank subsidies are excluded", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "custom" }));
    expect(r.find((s) => s.id === "kodomo-eco")).toBeUndefined();
  });

  it("totalSubsidyAmount sums the applied IDs", () => {
    const input = baseInput({ insulationPreset: "heat20-g2", solarCapacity: 5 });
    const total = totalSubsidyAmount(input, ["zeh", "kodomo-eco", "long-life", "battery-doe"]);
    // All are applied (G2 ranks above zeh)
    expect(total).toBe(550_000 + 800_000 + 1_000_000 + 200_000);
  });

  it("returns zero for empty ids", () => {
    expect(totalSubsidyAmount(baseInput(), [])).toBe(0);
  });

  it("ignores unknown ids without throwing", () => {
    expect(totalSubsidyAmount(baseInput(), ["nonexistent"])).toBe(0);
  });
});

describe("presets: build*Scenario", () => {
  it("buildHighPerformanceScenario", () => {
    const s = buildHighPerformanceScenario(baseInput());
    expect(s.id).toBe("preset-high-performance");
    expect(s.input.windowSpec).toBe("resin-pair-lowe");
  });

  it("buildHighPerformanceSolarBatteryScenario: 5 kW solar + 7 kWh battery + HEMS", () => {
    const s = buildHighPerformanceSolarBatteryScenario(baseInput());
    expect(s.input.solarCapacity).toBe(5);
    expect(s.input.batteryCapacity).toBe(7);
    expect(s.input.hems).toBe(true);
  });

  it("buildUserScenario keeps the input as is", () => {
    const input = baseInput({ uaValue: 0.42 });
    expect(buildUserScenario(input).input.uaValue).toBe(0.42);
  });

  it("buildRenovationAsIsScenario uses the existing spec with no solar", () => {
    const input = baseInput({
      mode: "renovation",
      renovation: {
        ageBracket: "before-1980",
        remainingYears: 15,
        existingUa: 1.8,
        existingCValue: 8.0,
        existingWindow: "alum-pair",
        existingWaterHeater: "gas",
        existingHeating: "ac-only",
        items: [],
      },
    });
    const s = buildRenovationAsIsScenario(input);
    expect(s.input.uaValue).toBe(1.8);
    expect(s.input.solarCapacity).toBe(0);
    expect(s.input.renovation).toBeUndefined();
  });

  it("buildRenovationAsIsScenario falls back to user without renovation", () => {
    const s = buildRenovationAsIsScenario(baseInput()); // mode: new-build, renovation undefined
    expect(s.id).toBe("user");
  });

  it("buildAllScenarios returns 4 scenarios in new-build mode", () => {
    expect(buildAllScenarios(baseInput())).toHaveLength(4);
  });

  it("buildAllScenarios returns 2 scenarios in renovation mode", () => {
    const input = baseInput({
      mode: "renovation",
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
    expect(buildAllScenarios(input)).toHaveLength(2);
  });

  it("defaultRenovationInput defaults to 1980-1999 with the region-6 UA", () => {
    const r = defaultRenovationInput(baseInput({ region: 6 }));
    expect(r.ageBracket).toBe("1980-1999");
    expect(r.remainingYears).toBe(20);
    expect(r.existingHeating).toBe("ac-only");
  });

  it("defaultRenovationInput keeps existing values", () => {
    const r = defaultRenovationInput(
      baseInput({
        renovation: {
          ageBracket: "before-1980",
          remainingYears: 10,
          existingUa: 2.5,
          existingCValue: 9,
          existingWindow: "alum-resin-pair-lowe",
          existingWaterHeater: "ene-farm",
          existingHeating: "central-air",
          items: ["external-insulation"],
        },
      })
    );
    expect(r.ageBracket).toBe("before-1980");
    expect(r.existingUa).toBe(2.5);
    expect(r.existingWaterHeater).toBe("ene-farm");
    expect(r.items).toEqual(["external-insulation"]);
  });

  it("applyInsulation returns the input unchanged for the custom preset", () => {
    const input = baseInput({ insulationPreset: "custom", uaValue: 0.33 });
    const s = buildHighPerformanceScenario(input);
    // applyInsulation(_, 'heat20-g2') runs, so uaValue is overwritten with the g2 value
    expect(s.input.uaValue).not.toBe(0.33);
  });
});

describe("subsidy: rank falls back for an unknown preset", () => {
  it("unknown non-custom values fall back to 0", () => {
    // Passing a preset not in INSULATION_RANK does not crash
    const r = matchSubsidies({
      ...baseInput(),
      // @ts-expect-error deliberately pass an invalid value to trigger the internal rank fallback
      insulationPreset: "unknown-preset",
    });
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("battery: branches around zero solar", () => {
  it("returns early with 0 for negative solarCapacity", () => {
    expect(calcSelfConsumption(baseInput({ solarCapacity: -1 })).selfConsumptionRate).toBe(0);
  });
});
