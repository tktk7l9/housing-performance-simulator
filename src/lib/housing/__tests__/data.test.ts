import { describe, it, expect } from "vitest";
import { AGE_PRESETS, uaForAge } from "../data/agePresets";
import { lookupRegion, citiesFor, PREFECTURE_DEFAULT, PREFECTURE_LIST, CITY_OVERRIDES } from "../data/regionLookup";
import { tiltFactor, ANNUAL_HORIZONTAL_IRRADIANCE, ORIENTATION_FACTOR, SOLAR_LOSS_FACTOR } from "../data/solarIrradiance";
import { INSULATION_PRESETS, presetExtraCost } from "../data/insulationPresets";
import { WINDOW_SPECS } from "../data/windows";
import { RENOVATION_ITEMS, estimateOpenings } from "../data/renovationCosts";
import { SUBSIDIES } from "../data/subsidies";
import { CO2_EMISSION_FACTOR_ELECTRICITY, CO2_EMISSION_FACTOR_GAS } from "../data/co2";
import { WATER_HEATERS, HEATING_OPTIONS, SOLAR_COST_PER_KW, BATTERY_COST_PER_KWH, HEMS_COST, OTHER_KWH_PER_PERSON_YEAR } from "../data/equipment";
import { DEFAULT_ELECTRICITY_PRICE, DEFAULT_GAS_PRICE, DEFAULT_SELL_PRICE_FIT, DEFAULT_SELL_PRICE_POST_FIT, FIT_YEARS, ELECTRICITY_RISE_RATES, GAS_KWH_PER_M3 } from "../data/electricityPlans";

describe("agePresets", () => {
  it("defines all four construction-age brackets", () => {
    expect(Object.keys(AGE_PRESETS)).toHaveLength(4);
  });
  it("uaForAge: cold regions (region <= 3) use 0.85x", () => {
    expect(uaForAge("1980-1999", 1)).toBeCloseTo(1.20 * 0.85, 2);
  });
  it("uaForAge: mid regions (4-5) use 0.92x", () => {
    expect(uaForAge("1980-1999", 4)).toBeCloseTo(1.20 * 0.92, 2);
  });
  it("uaForAge: warm regions (>= 6) are unchanged", () => {
    expect(uaForAge("1980-1999", 6)).toBe(1.20);
    expect(uaForAge("2000-2009", 8)).toBe(0.95);
  });
});

describe("regionLookup", () => {
  it("PREFECTURE_DEFAULT covers 47 prefectures", () => {
    expect(Object.keys(PREFECTURE_DEFAULT)).toHaveLength(47);
  });

  it("lookupRegion: matches by prefecture without a city", () => {
    const r = lookupRegion("東京都");
    expect(r.matched).toBe("prefecture");
    expect(r.region).toBe(6);
  });

  it("lookupRegion: matches the city when it is in CITY_OVERRIDES", () => {
    const r = lookupRegion("北海道", "旭川市");
    expect(r.matched).toBe("city");
    expect(r.region).toBe(1);
  });

  it("lookupRegion: falls back to the prefecture when the city is not in CITY_OVERRIDES", () => {
    const r = lookupRegion("北海道", "知床町");
    expect(r.matched).toBe("prefecture");
    expect(r.region).toBe(2); // Hokkaido default
  });

  it("citiesFor: filters by prefecture prefix", () => {
    const cs = citiesFor("北海道");
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs) expect(CITY_OVERRIDES[`北海道 ${c}`]).toBeDefined();
  });

  it("PREFECTURE_LIST matches the PREFECTURE_DEFAULT keys", () => {
    expect(PREFECTURE_LIST.sort()).toEqual(Object.keys(PREFECTURE_DEFAULT).sort() as typeof PREFECTURE_LIST);
  });
});

describe("solarIrradiance", () => {
  it("ANNUAL_HORIZONTAL_IRRADIANCE: all 8 regions are between 1000 and 2000", () => {
    for (const v of Object.values(ANNUAL_HORIZONTAL_IRRADIANCE)) {
      expect(v).toBeGreaterThan(1000);
      expect(v).toBeLessThan(2000);
    }
  });

  it("ORIENTATION_FACTOR: south=1.0", () => {
    expect(ORIENTATION_FACTOR.south).toBe(1.0);
  });

  it("tiltFactor is continuous with 0°=1.0, 30°≈1.10, 90°≈0.70", () => {
    expect(tiltFactor(0)).toBeCloseTo(1.0, 5);
    expect(tiltFactor(30)).toBeCloseTo(1.10, 5);
    expect(tiltFactor(90)).toBeCloseTo(0.70, 5);
  });

  it("tiltFactor clamps below 0 to 0 and above 90 to 90", () => {
    expect(tiltFactor(-10)).toBeCloseTo(tiltFactor(0), 5);
    expect(tiltFactor(100)).toBeCloseTo(tiltFactor(90), 5);
  });

  it("SOLAR_LOSS_FACTOR is within 0..1", () => {
    expect(SOLAR_LOSS_FACTOR).toBeGreaterThan(0);
    expect(SOLAR_LOSS_FACTOR).toBeLessThanOrEqual(1);
  });
});

describe("insulationPresets", () => {
  it("defines every preset except custom", () => {
    expect(INSULATION_PRESETS["energy-saving"]).toBeDefined();
    expect(INSULATION_PRESETS.zeh).toBeDefined();
    expect(INSULATION_PRESETS["heat20-g1"]).toBeDefined();
    expect(INSULATION_PRESETS["heat20-g2"]).toBeDefined();
    expect(INSULATION_PRESETS["heat20-g3"]).toBeDefined();
  });

  it("presetExtraCost: 0 for custom", () => {
    expect(presetExtraCost("custom", 120)).toBe(0);
  });

  it("presetExtraCost scales with floor area", () => {
    const at120 = presetExtraCost("zeh", 120);
    const at240 = presetExtraCost("zeh", 240);
    expect(at240).toBeCloseTo(at120 * 2, 5);
  });

  it("presetExtraCost: g3 > g2 > g1 > zeh > energy-saving(=0)", () => {
    expect(presetExtraCost("energy-saving", 120)).toBe(0);
    expect(presetExtraCost("zeh", 120)).toBeGreaterThan(0);
    expect(presetExtraCost("heat20-g1", 120)).toBeGreaterThan(presetExtraCost("zeh", 120));
    expect(presetExtraCost("heat20-g3", 120)).toBeGreaterThan(presetExtraCost("heat20-g2", 120));
  });
});

describe("windows", () => {
  it("defines U-values for all four specs", () => {
    expect(Object.keys(WINDOW_SPECS)).toHaveLength(4);
    for (const v of Object.values(WINDOW_SPECS)) {
      expect(v.uValue).toBeGreaterThan(0);
    }
  });
});

describe("renovationCosts", () => {
  it("estimateOpenings: 14 openings for 120 m²", () => {
    expect(estimateOpenings(120)).toBe(14);
  });
  it("estimateOpenings: at least 6 openings for 60 m²", () => {
    expect(estimateOpenings(60)).toBe(7); // round(60/120*14)=7, minimum 6
  });
  it("estimateOpenings: at least 6 openings for a tiny floor area", () => {
    expect(estimateOpenings(10)).toBe(6);
  });
  it("every RENOVATION_ITEMS unit is one of the three kinds", () => {
    for (const it of Object.values(RENOVATION_ITEMS)) {
      expect(["perFloorAreaM2", "perOpening", "lumpSum"]).toContain(it.unit);
    }
  });
});

describe("subsidies / co2 / equipment / electricityPlans", () => {
  it("SUBSIDIES: every entry has the required fields", () => {
    expect(SUBSIDIES.length).toBeGreaterThan(0);
    for (const s of SUBSIDIES) {
      expect(s.id).toBeTruthy();
      expect(s.amount).toBeGreaterThan(0);
      expect(s.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("CO2 factors are positive", () => {
    expect(CO2_EMISSION_FACTOR_ELECTRICITY).toBeGreaterThan(0);
    expect(CO2_EMISSION_FACTOR_GAS).toBeGreaterThan(0);
  });

  it("equipment constants", () => {
    expect(WATER_HEATERS["eco-cute"].efficiency).toBeGreaterThan(1);
    expect(HEATING_OPTIONS["ac-only"].copHeating).toBeGreaterThan(1);
    expect(SOLAR_COST_PER_KW).toBeGreaterThan(0);
    expect(BATTERY_COST_PER_KWH).toBeGreaterThan(0);
    expect(HEMS_COST).toBeGreaterThan(0);
    expect(OTHER_KWH_PER_PERSON_YEAR).toBeGreaterThan(0);
  });

  it("electricity plan constants", () => {
    expect(DEFAULT_ELECTRICITY_PRICE).toBe(32);
    expect(DEFAULT_GAS_PRICE).toBe(200);
    expect(DEFAULT_SELL_PRICE_FIT).toBe(15);
    expect(DEFAULT_SELL_PRICE_POST_FIT).toBe(8);
    expect(FIT_YEARS).toBe(10);
    expect(ELECTRICITY_RISE_RATES.flat).toBe(0);
    expect(ELECTRICITY_RISE_RATES.steep).toBeGreaterThan(ELECTRICITY_RISE_RATES.moderate);
    expect(GAS_KWH_PER_M3).toBeCloseTo(11, 0);
  });
});
