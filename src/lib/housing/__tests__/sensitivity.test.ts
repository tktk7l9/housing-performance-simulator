import { describe, it, expect } from "vitest";
import { runSensitivity } from "../sensitivity";
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

describe("runSensitivity", () => {
  it("returns results for all six parameters", () => {
    const r = runSensitivity(baseInput());
    expect(r).toHaveLength(6);
    const keys = r.map((d) => d.key).sort();
    expect(keys).toEqual([
      "electricityPrice",
      "electricityRise",
      "livingYears",
      "sellPriceFit",
      "solarCapacity",
      "uaValue",
    ]);
  });

  it("sorts by impact in descending order", () => {
    const r = runSensitivity(baseInput());
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].impact).toBeGreaterThanOrEqual(r[i].impact);
    }
  });

  it("defines centerLabel, lowLabel, highLabel and centerCost on every row", () => {
    const r = runSensitivity(baseInput());
    for (const row of r) {
      expect(row.centerLabel).toBeTruthy();
      expect(row.lowLabel).toBeTruthy();
      expect(row.highLabel).toBeTruthy();
      expect(typeof row.centerCost).toBe("number");
    }
  });

  it("works in renovation mode", () => {
    const r = runSensitivity(
      baseInput({
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
      })
    );
    expect(r).toHaveLength(6);
  });

  it("with electricityRise=steep as the base, high stays steep", () => {
    const r = runSensitivity(baseInput({ electricityRise: "steep" }));
    const row = r.find((d) => d.key === "electricityRise")!;
    expect(row.centerLabel).toContain("+5%");
  });

  it("clamps low to 0 when solarCapacity=0", () => {
    const r = runSensitivity(baseInput({ solarCapacity: 0 }));
    const row = r.find((d) => d.key === "solarCapacity")!;
    expect(row.lowLabel).toContain("0 kW");
  });

  it("clamps the low uaValue to 0.15", () => {
    const r = runSensitivity(baseInput({ uaValue: 0.20 }));
    const row = r.find((d) => d.key === "uaValue")!;
    // 0.20 - 0.15 = 0.05 -> clamped to 0.15
    expect(row.lowLabel).toContain("0.15");
  });

  it("electricityPriceBuy: clamps low to 5 yen in the extreme case", () => {
    const r = runSensitivity(baseInput({ electricityPriceBuy: 6 })); // 0.7*6=4.2 -> clamped to 5
    const row = r.find((d) => d.key === "electricityPrice")!;
    expect(row.lowLabel).toContain("5");
  });

  it("sellPriceFit: clamps low to 0", () => {
    const r = runSensitivity(baseInput({ sellPriceFit: 3 })); // 3-5=-2 → 0
    const row = r.find((d) => d.key === "sellPriceFit")!;
    expect(row.lowLabel).toContain("0");
  });
});
