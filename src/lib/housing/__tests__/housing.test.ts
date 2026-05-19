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
  it("断熱が良くなれば（UA小）熱負荷が下がる", () => {
    const poor = calcHeatLoad(baseInput({ uaValue: 0.87 }));
    const good = calcHeatLoad(baseInput({ uaValue: 0.46 }));
    expect(good.heatingLoadKwh).toBeLessThan(poor.heatingLoadKwh);
    expect(good.coolingLoadKwh).toBeLessThan(poor.coolingLoadKwh);
  });

  it("寒冷地（region 1）は温暖地（region 6）より暖房負荷が大きい", () => {
    const cold = calcHeatLoad(baseInput({ region: 1 }));
    const warm = calcHeatLoad(baseInput({ region: 6 }));
    expect(cold.heatingLoadKwh).toBeGreaterThan(warm.heatingLoadKwh);
  });

  it("床面積に概ね比例", () => {
    const small = calcHeatLoad(baseInput({ floorArea: 80 }));
    const large = calcHeatLoad(baseInput({ floorArea: 160 }));
    // 160/80 = 2.0 倍ぴったり
    expect(large.heatingLoadKwh / small.heatingLoadKwh).toBeCloseTo(2.0, 5);
  });

  it("totalEnergyKwh は heating/cooling 負荷 ÷ COP の合計", () => {
    const r = calcHeatLoad(baseInput({ heating: "ac-only" }));
    // ac-only: copHeating=4.5, copCooling=5.5
    const expected = r.heatingLoadKwh / 4.5 + r.coolingLoadKwh / 5.5;
    expect(r.totalEnergyKwh).toBeCloseTo(expected, 5);
  });
});

describe("calcHotWater", () => {
  it("エコキュート: ガスはゼロ・電力は正", () => {
    const r = calcHotWater(baseInput({ waterHeater: "eco-cute" }));
    expect(r.gasM3).toBe(0);
    expect(r.electricityKwh).toBeGreaterThan(0);
  });

  it("ガス給湯: ガス消費は正・電力は 0", () => {
    const r = calcHotWater(baseInput({ waterHeater: "gas" }));
    expect(r.gasM3).toBeGreaterThan(0);
    expect(r.electricityKwh).toBe(0);
  });

  it("エネファーム: 電力は負（家庭消費を相殺）", () => {
    const r = calcHotWater(baseInput({ waterHeater: "ene-farm" }));
    expect(r.electricityKwh).toBeLessThan(0);
    expect(r.gasM3).toBeGreaterThan(0);
  });

  it("世帯人数が増えると総需要熱量も増える（規模逓減があっても）", () => {
    const solo = calcHotWater(baseInput({ household: 1 }));
    const fam  = calcHotWater(baseInput({ household: 4 }));
    expect(fam.demandHeatKwh).toBeGreaterThan(solo.demandHeatKwh);
  });
});

describe("calcInitialCost", () => {
  it("HEMS なし vs あり: HEMS分だけ total が増える", () => {
    const noHems   = calcInitialCost(baseInput({ hems: false }));
    const withHems = calcInitialCost(baseInput({ hems: true }));
    expect(withHems.total - noHems.total).toBe(withHems.hems);
    expect(withHems.hems).toBeGreaterThan(0);
  });

  it("太陽光 0 → 5kW で solar 費用が線形に増える", () => {
    const zero  = calcInitialCost(baseInput({ solarCapacity: 0 }));
    const five  = calcInitialCost(baseInput({ solarCapacity: 5 }));
    expect(zero.solar).toBe(0);
    expect(five.solar).toBeGreaterThan(0);
    // 5kW で太陽光単価 × 5 になっているはず
    expect(five.solar).toBeCloseTo(five.solar, 5);
  });

  it("リフォームモードでは insulation/waterHeater/heating は 0", () => {
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

  it("内訳の合計は total と一致", () => {
    const r = calcInitialCost(baseInput({ solarCapacity: 5, batteryCapacity: 10, hems: true }));
    const sum =
      r.insulation + r.renovation + r.solar + r.battery +
      r.waterHeater + r.heating + r.hems;
    expect(sum).toBe(r.total);
  });
});

describe("calcRenovationCost", () => {
  it("renovation 未設定なら 0", () => {
    expect(calcRenovationCost(baseInput())).toBe(0);
  });

  it("lumpSum 単位の項目 (airtight-improvement) も計上される", () => {
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

  it("perOpening 単位の項目 (inner-window) も計上される", () => {
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

  it("項目数が増えれば費用も増える（同条件下）", () => {
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
  it("空入力で安全な既定値が埋まる", () => {
    const r = sanitizeInput({});
    expect(r.mode).toBe("new-build");
    expect(r.floorArea).toBeGreaterThanOrEqual(30);
    expect(r.floorArea).toBeLessThanOrEqual(500);
    expect(r.region).toBeGreaterThanOrEqual(1);
    expect(r.region).toBeLessThanOrEqual(8);
  });

  it("数値はクランプ範囲に収まる（floorArea 上下限）", () => {
    expect(sanitizeInput({ floorArea: 5 }).floorArea).toBe(30);
    expect(sanitizeInput({ floorArea: 9999 }).floorArea).toBe(500);
  });

  it("不正な enum はフォールバック値に戻る", () => {
    expect(sanitizeInput({ mode: "INVALID" }).mode).toBe("new-build");
    expect(sanitizeInput({ region: 99 }).region).toBe(6);
    expect(sanitizeInput({ insulationPreset: "WRONG" }).insulationPreset).toBe("energy-saving");
  });

  it("数値文字列は数値として受理される", () => {
    expect(sanitizeInput({ floorArea: "120" }).floorArea).toBe(120);
  });

  it("NaN/Infinity は既定値に戻る", () => {
    expect(sanitizeInput({ floorArea: NaN }).floorArea).toBe(120);
    expect(sanitizeInput({ floorArea: Infinity }).floorArea).toBe(120);
  });

  it("appliedSubsidyIds は最大 32 件に制限・空文字除去", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    expect(sanitizeInput({ appliedSubsidyIds: [...ids, "", "  "] }).appliedSubsidyIds).toHaveLength(32);
  });

  it("renovation の不正 item は捨てられ、重複も除去される", () => {
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
  it("migrateInput は sanitizeInput と同じ結果 (現状は委譲のみ)", async () => {
    const { migrateInput } = await import("../schema");
    const r = migrateInput({ floorArea: 130, region: 5 });
    expect(r.floorArea).toBe(130);
    expect(r.region).toBe(5);
  });
});

describe("envelope", () => {
  it("makeEnvelope → unwrapEnvelope ラウンドトリップで同等の入力が復元できる", () => {
    const input = baseInput({ floorArea: 110, region: 4 });
    const env = makeEnvelope(input);
    expect(env.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const restored = unwrapEnvelope(env);
    expect(restored?.floorArea).toBe(110);
    expect(restored?.region).toBe(4);
  });

  it("schemaVersion なしの素データも v1 として受理される", () => {
    const r = unwrapEnvelope({ floorArea: 100, region: 5 });
    expect(r).not.toBeNull();
    expect(r?.floorArea).toBe(100);
    expect(r?.region).toBe(5);
  });

  it("null や非オブジェクトは null を返す", () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope("str")).toBeNull();
    expect(unwrapEnvelope(42)).toBeNull();
  });
});
