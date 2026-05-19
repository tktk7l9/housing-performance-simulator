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
  it("6 パラメータすべての結果が返る", () => {
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

  it("影響度（impact）の降順でソート", () => {
    const r = runSensitivity(baseInput());
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].impact).toBeGreaterThanOrEqual(r[i].impact);
    }
  });

  it("各行の centerLabel/lowLabel/highLabel/centerCost が定義済み", () => {
    const r = runSensitivity(baseInput());
    for (const row of r) {
      expect(row.centerLabel).toBeTruthy();
      expect(row.lowLabel).toBeTruthy();
      expect(row.highLabel).toBeTruthy();
      expect(typeof row.centerCost).toBe("number");
    }
  });

  it("リフォームモードでも動作", () => {
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

  it("electricityRise=steep をベースにすると high は同じ steep", () => {
    const r = runSensitivity(baseInput({ electricityRise: "steep" }));
    const row = r.find((d) => d.key === "electricityRise")!;
    expect(row.centerLabel).toContain("+5%");
  });

  it("solarCapacity=0 でも low は 0 にクランプ", () => {
    const r = runSensitivity(baseInput({ solarCapacity: 0 }));
    const row = r.find((d) => d.key === "solarCapacity")!;
    expect(row.lowLabel).toContain("0 kW");
  });

  it("uaValue 下端は 0.15 にクランプ", () => {
    const r = runSensitivity(baseInput({ uaValue: 0.20 }));
    const row = r.find((d) => d.key === "uaValue")!;
    // 0.20 - 0.15 = 0.05 → クランプで 0.15
    expect(row.lowLabel).toContain("0.15");
  });

  it("electricityPriceBuy: low が単価 5 円にクランプされる極端ケース", () => {
    const r = runSensitivity(baseInput({ electricityPriceBuy: 6 })); // 0.7*6=4.2 → 5にクランプ
    const row = r.find((d) => d.key === "electricityPrice")!;
    expect(row.lowLabel).toContain("5");
  });

  it("sellPriceFit: low は 0 にクランプ", () => {
    const r = runSensitivity(baseInput({ sellPriceFit: 3 })); // 3-5=-2 → 0
    const row = r.find((d) => d.key === "sellPriceFit")!;
    expect(row.lowLabel).toContain("0");
  });
});
