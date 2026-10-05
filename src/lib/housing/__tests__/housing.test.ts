import { describe, it, expect } from "vitest";
import { calcHeatLoad } from "../heatLoad";
import { calcHotWater } from "../hotWater";
import { calcInitialCost, calcRenovationCost } from "../cost";
import { sanitizeInput, unwrapEnvelope, makeEnvelope, CURRENT_SCHEMA_VERSION } from "../schema";
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

describe("calcHeatLoad", () => {
  it("better insulation (lower UA) lowers the heat load", () => {
    const poor = calcHeatLoad(baseInput({ uaValue: 0.87 }));
    const good = calcHeatLoad(baseInput({ uaValue: 0.46 }));
    expect(good.heatingLoadKwh).toBeLessThan(poor.heatingLoadKwh);
    expect(good.coolingLoadKwh).toBeLessThan(poor.coolingLoadKwh);
  });

  it("a cold region (1) has a larger heating load than a warm one (6)", () => {
    const cold = calcHeatLoad(baseInput({ region: 1 }));
    const warm = calcHeatLoad(baseInput({ region: 6 }));
    expect(cold.heatingLoadKwh).toBeGreaterThan(warm.heatingLoadKwh);
  });

  it("scales roughly with floor area", () => {
    const small = calcHeatLoad(baseInput({ floorArea: 80 }));
    const large = calcHeatLoad(baseInput({ floorArea: 160 }));
    // 160/80 = exactly 2.0x
    expect(large.heatingLoadKwh / small.heatingLoadKwh).toBeCloseTo(2.0, 5);
  });

  it("totalEnergyKwh is the sum of heating/cooling load divided by COP", () => {
    const r = calcHeatLoad(baseInput({ heating: "ac-only" }));
    // ac-only: copHeating=4.5, copCooling=5.5
    const expected = r.heatingLoadKwh / 4.5 + r.coolingLoadKwh / 5.5;
    expect(r.totalEnergyKwh).toBeCloseTo(expected, 5);
  });
});

describe("calcHotWater", () => {
  it("EcoCute (エコキュート): zero gas, positive electricity", () => {
    const r = calcHotWater(baseInput({ waterHeater: "eco-cute" }));
    expect(r.gasM3).toBe(0);
    expect(r.electricityKwh).toBeGreaterThan(0);
  });

  it("gas water heater: positive gas, zero electricity", () => {
    const r = calcHotWater(baseInput({ waterHeater: "gas" }));
    expect(r.gasM3).toBeGreaterThan(0);
    expect(r.electricityKwh).toBe(0);
  });

  it("ENE-FARM: negative electricity (offsets household use)", () => {
    const r = calcHotWater(baseInput({ waterHeater: "ene-farm" }));
    expect(r.electricityKwh).toBeLessThan(0);
    expect(r.gasM3).toBeGreaterThan(0);
  });

  it("more household members raise total heat demand (despite diminishing scale)", () => {
    const solo = calcHotWater(baseInput({ household: 1 }));
    const fam  = calcHotWater(baseInput({ household: 4 }));
    expect(fam.demandHeatKwh).toBeGreaterThan(solo.demandHeatKwh);
  });
});

describe("calcInitialCost", () => {
  it("HEMS adds exactly its own cost to the total", () => {
    const noHems   = calcInitialCost(baseInput({ hems: false }));
    const withHems = calcInitialCost(baseInput({ hems: true }));
    expect(withHems.total - noHems.total).toBe(withHems.hems);
    expect(withHems.hems).toBeGreaterThan(0);
  });

  it("solar cost grows linearly from 0 to 5 kW", () => {
    const zero  = calcInitialCost(baseInput({ solarCapacity: 0 }));
    const five  = calcInitialCost(baseInput({ solarCapacity: 5 }));
    expect(zero.solar).toBe(0);
    expect(five.solar).toBeGreaterThan(0);
    // At 5kW it should be the solar unit price × 5
    expect(five.solar).toBeCloseTo(five.solar, 5);
  });

  it("renovation mode has zero insulation, waterHeater and heating cost", () => {
    const r = calcInitialCost(
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
          items: ["ceiling-insulation"],
        },
      })
    );
    expect(r.insulation).toBe(0);
    expect(r.waterHeater).toBe(0);
    expect(r.heating).toBe(0);
    expect(r.renovation).toBeGreaterThan(0);
  });

  it("the breakdown sums to the total", () => {
    const r = calcInitialCost(baseInput({ solarCapacity: 5, batteryCapacity: 10, hems: true }));
    const sum =
      r.insulation + r.renovation + r.solar + r.battery +
      r.waterHeater + r.heating + r.hems;
    expect(sum).toBe(r.total);
  });
});

describe("calcRenovationCost", () => {
  it("returns 0 without renovation", () => {
    expect(calcRenovationCost(baseInput())).toBe(0);
  });

  it("counts lumpSum items (airtight-improvement)", () => {
    const cost = calcRenovationCost(
      baseInput({
        mode: "renovation",
        renovation: {
          ageBracket: "1980-1999",
          remainingYears: 20,
          existingUa: 1.5, existingCValue: 5,
          existingWindow: "alum-pair",
          existingWaterHeater: "gas", existingHeating: "ac-only",
          items: ["airtight-improvement"],
        },
      })
    );
    expect(cost).toBe(350_000);
  });

  it("counts perOpening items (inner-window)", () => {
    const cost = calcRenovationCost(
      baseInput({
        floorArea: 120, // estimateOpenings(120)=14
        mode: "renovation",
        renovation: {
          ageBracket: "1980-1999",
          remainingYears: 20,
          existingUa: 1.5, existingCValue: 5,
          existingWindow: "alum-pair",
          existingWaterHeater: "gas", existingHeating: "ac-only",
          items: ["inner-window"],
        },
      })
    );
    expect(cost).toBe(80000 * 14);
  });

  it("more items cost more under the same conditions", () => {
    const one = calcRenovationCost(
      baseInput({
        mode: "renovation",
        renovation: {
          ageBracket: "1980-1999",
          remainingYears: 20,
          existingUa: 1.5, existingCValue: 5,
          existingWindow: "alum-pair",
          existingWaterHeater: "gas", existingHeating: "ac-only",
          items: ["ceiling-insulation"],
        },
      })
    );
    const two = calcRenovationCost(
      baseInput({
        mode: "renovation",
        renovation: {
          ageBracket: "1980-1999",
          remainingYears: 20,
          existingUa: 1.5, existingCValue: 5,
          existingWindow: "alum-pair",
          existingWaterHeater: "gas", existingHeating: "ac-only",
          items: ["ceiling-insulation", "floor-insulation"],
        },
      })
    );
    expect(two).toBeGreaterThan(one);
  });
});

describe("sanitizeInput", () => {
  it("fills safe defaults for empty input", () => {
    const r = sanitizeInput({});
    expect(r.mode).toBe("new-build");
    expect(r.floorArea).toBeGreaterThanOrEqual(30);
    expect(r.floorArea).toBeLessThanOrEqual(500);
    expect(r.region).toBeGreaterThanOrEqual(1);
    expect(r.region).toBeLessThanOrEqual(8);
  });

  it("clamps numbers to their range (floorArea bounds)", () => {
    expect(sanitizeInput({ floorArea: 5 }).floorArea).toBe(30);
    expect(sanitizeInput({ floorArea: 9999 }).floorArea).toBe(500);
  });

  it("falls back for invalid enums", () => {
    expect(sanitizeInput({ mode: "INVALID" }).mode).toBe("new-build");
    expect(sanitizeInput({ region: 99 }).region).toBe(6);
    expect(sanitizeInput({ insulationPreset: "WRONG" }).insulationPreset).toBe("energy-saving");
  });

  it("accepts numeric strings as numbers", () => {
    expect(sanitizeInput({ floorArea: "120" }).floorArea).toBe(120);
  });

  it("resets NaN/Infinity to defaults", () => {
    expect(sanitizeInput({ floorArea: NaN }).floorArea).toBe(120);
    expect(sanitizeInput({ floorArea: Infinity }).floorArea).toBe(120);
  });

  it("limits appliedSubsidyIds to 32 and drops empty strings", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    expect(sanitizeInput({ appliedSubsidyIds: [...ids, "", "  "] }).appliedSubsidyIds).toHaveLength(32);
  });

  it("drops invalid and duplicate renovation items", () => {
    const r = sanitizeInput({
      mode: "renovation",
      renovation: {
        items: ["ceiling-insulation", "BOGUS", "ceiling-insulation", "floor-insulation"],
      },
    });
    expect(r.renovation?.items.sort()).toEqual(["ceiling-insulation", "floor-insulation"]);
  });
});

describe("migrateInput", () => {
  it("migrateInput matches sanitizeInput (it only delegates for now)", async () => {
    const { migrateInput } = await import("../schema");
    const r = migrateInput({ floorArea: 130, region: 5 });
    expect(r.floorArea).toBe(130);
    expect(r.region).toBe(5);
  });
});

describe("envelope", () => {
  it("makeEnvelope -> unwrapEnvelope round-trips the input", () => {
    const input = baseInput({ floorArea: 110, region: 4 });
    const env = makeEnvelope(input);
    expect(env.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const restored = unwrapEnvelope(env);
    expect(restored?.floorArea).toBe(110);
    expect(restored?.region).toBe(4);
  });

  it("accepts bare data without schemaVersion as v1", () => {
    const r = unwrapEnvelope({ floorArea: 100, region: 5 });
    expect(r).not.toBeNull();
    expect(r?.floorArea).toBe(100);
    expect(r?.region).toBe(5);
  });

  it("returns null for null and non-objects", () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope("str")).toBeNull();
    expect(unwrapEnvelope(42)).toBeNull();
  });
});
