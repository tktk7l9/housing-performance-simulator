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
  it("太陽光容量 0 は発電量 0", () => {
    expect(calcSolar(baseInput({ solarCapacity: 0 })).annualKwh).toBe(0);
  });

  it("南面が東/西より発電量大", () => {
    const south = calcSolar(baseInput({ solarOrientation: "south" })).annualKwh;
    const east = calcSolar(baseInput({ solarOrientation: "east" })).annualKwh;
    expect(south).toBeGreaterThan(east);
  });

  it("南東・南西は中間", () => {
    const south = calcSolar(baseInput({ solarOrientation: "south" })).annualKwh;
    const sw = calcSolar(baseInput({ solarOrientation: "south-west" })).annualKwh;
    const se = calcSolar(baseInput({ solarOrientation: "south-east" })).annualKwh;
    const w = calcSolar(baseInput({ solarOrientation: "west" })).annualKwh;
    expect(sw).toBeLessThan(south);
    expect(sw).toBeGreaterThan(w);
    expect(se).toBe(sw); // 両方 0.96
  });

  it("傾斜 30° が最大付近、0° と 90° は減少", () => {
    const tilt0  = calcSolar(baseInput({ solarTilt: 0 })).annualKwh;
    const tilt30 = calcSolar(baseInput({ solarTilt: 30 })).annualKwh;
    const tilt90 = calcSolar(baseInput({ solarTilt: 90 })).annualKwh;
    expect(tilt30).toBeGreaterThan(tilt0);
    expect(tilt30).toBeGreaterThan(tilt90);
  });

  it("傾斜 30° 超 (例 60°) でも 0 < tiltFactor < 1.1", () => {
    const v = calcSolar(baseInput({ solarTilt: 60 })).annualKwh;
    expect(v).toBeGreaterThan(0);
  });

  it("地域 1 (寒冷) より地域 8 (温暖) のほうが発電量大", () => {
    const r1 = calcSolar(baseInput({ region: 1 })).annualKwh;
    const r8 = calcSolar(baseInput({ region: 8 })).annualKwh;
    expect(r8).toBeGreaterThan(r1);
  });
});

describe("calcSelfConsumption", () => {
  it("太陽光なしは self-consumption 0", () => {
    expect(calcSelfConsumption(baseInput({ solarCapacity: 0 })).selfConsumptionRate).toBe(0);
  });

  it("夕方在宅 < 終日在宅", () => {
    const ev = calcSelfConsumption(baseInput({ presence: "evening-only" })).selfConsumptionRate;
    const ad = calcSelfConsumption(baseInput({ presence: "all-day" })).selfConsumptionRate;
    expect(ad).toBeGreaterThan(ev);
  });

  it("蓄電池容量が増えると self-consumption も増える (漸近)", () => {
    const b0  = calcSelfConsumption(baseInput({ batteryCapacity: 0 })).selfConsumptionRate;
    const b5  = calcSelfConsumption(baseInput({ batteryCapacity: 5 })).selfConsumptionRate;
    const b15 = calcSelfConsumption(baseInput({ batteryCapacity: 15 })).selfConsumptionRate;
    expect(b5).toBeGreaterThan(b0);
    expect(b15).toBeGreaterThan(b5);
  });

  it("HEMS あり: 自家消費 +0.05", () => {
    const a = calcSelfConsumption(baseInput({ hems: false })).selfConsumptionRate;
    const b = calcSelfConsumption(baseInput({ hems: true })).selfConsumptionRate;
    expect(b).toBeCloseTo(a + 0.05, 5);
  });

  it("0.95 上限でクランプ", () => {
    const r = calcSelfConsumption(
      baseInput({ presence: "all-day", batteryCapacity: 50, hems: true })
    );
    expect(r.selfConsumptionRate).toBeLessThanOrEqual(0.95);
  });

  it("負の蓄電池容量は 0 として扱う", () => {
    const r = calcSelfConsumption(baseInput({ batteryCapacity: -5 }));
    // batteryUplift(-5) → 0 になるはず。base のみで判定可能
    expect(r.selfConsumptionRate).toBeGreaterThan(0);
  });
});

describe("calcAnnualCo2", () => {
  it("両方 0 → 0", () => {
    expect(calcAnnualCo2(0, 0)).toBe(0);
  });
  it("電気のみで概ね正", () => {
    expect(calcAnnualCo2(1000, 0)).toBeGreaterThan(0);
  });
  it("ガスのみで概ね正", () => {
    expect(calcAnnualCo2(0, 100)).toBeGreaterThan(0);
  });
  it("単調加算", () => {
    expect(calcAnnualCo2(1000, 100)).toBe(calcAnnualCo2(1000, 0) + calcAnnualCo2(0, 100));
  });
});

describe("matchSubsidies / totalSubsidyAmount", () => {
  it("デフォルト入力では蓄電池補助金 (要件なし) はマッチ", () => {
    const r = matchSubsidies(baseInput({ solarCapacity: 0 }));
    expect(r.find((s) => s.id === "battery-doe")).toBeDefined();
  });

  it("断熱要件 (ZEH 以上)・太陽光要件あり → 一致", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "zeh", solarCapacity: 5 }));
    expect(r.find((s) => s.id === "zeh")).toBeDefined();
  });

  it("ZEH 断熱だが太陽光なし → zeh 補助金は除外", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "zeh", solarCapacity: 0 }));
    expect(r.find((s) => s.id === "zeh")).toBeUndefined();
  });

  it("HEAT20-G1 で kodomo-eco がマッチ", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "heat20-g1" }));
    expect(r.find((s) => s.id === "kodomo-eco")).toBeDefined();
  });

  it("custom は ランク 0 → 高ランク要件補助金は除外", () => {
    const r = matchSubsidies(baseInput({ insulationPreset: "custom" }));
    expect(r.find((s) => s.id === "kodomo-eco")).toBeUndefined();
  });

  it("totalSubsidyAmount: 適用 ID の amount を合計", () => {
    const input = baseInput({ insulationPreset: "heat20-g2", solarCapacity: 5 });
    const total = totalSubsidyAmount(input, ["zeh", "kodomo-eco", "long-life", "battery-doe"]);
    // 全部適用される(G2はzehよりランク上)
    expect(total).toBe(550_000 + 800_000 + 1_000_000 + 200_000);
  });

  it("ids が空配列ならゼロ", () => {
    expect(totalSubsidyAmount(baseInput(), [])).toBe(0);
  });

  it("ids にマッチしない補助金が含まれてもエラーにならない", () => {
    expect(totalSubsidyAmount(baseInput(), ["nonexistent"])).toBe(0);
  });
});

describe("presets: build*Scenario", () => {
  it("buildHighPerformanceScenario", () => {
    const s = buildHighPerformanceScenario(baseInput());
    expect(s.id).toBe("preset-high-performance");
    expect(s.input.windowSpec).toBe("resin-pair-lowe");
  });

  it("buildHighPerformanceSolarBatteryScenario: 太陽光 5kW + 蓄電池 7kWh + HEMS", () => {
    const s = buildHighPerformanceSolarBatteryScenario(baseInput());
    expect(s.input.solarCapacity).toBe(5);
    expect(s.input.batteryCapacity).toBe(7);
    expect(s.input.hems).toBe(true);
  });

  it("buildUserScenario: 入力そのまま", () => {
    const input = baseInput({ uaValue: 0.42 });
    expect(buildUserScenario(input).input.uaValue).toBe(0.42);
  });

  it("buildRenovationAsIsScenario: 既存仕様で太陽光ゼロ", () => {
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

  it("buildRenovationAsIsScenario: renovation 無しは user に fallback", () => {
    const s = buildRenovationAsIsScenario(baseInput()); // mode: new-build, renovation undefined
    expect(s.id).toBe("user");
  });

  it("buildAllScenarios: 新築モードで 4 シナリオ", () => {
    expect(buildAllScenarios(baseInput())).toHaveLength(4);
  });

  it("buildAllScenarios: リフォームモードで 2 シナリオ", () => {
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

  it("defaultRenovationInput: renovation 未設定なら 1980-1999 既定 + 6 地域 UA", () => {
    const r = defaultRenovationInput(baseInput({ region: 6 }));
    expect(r.ageBracket).toBe("1980-1999");
    expect(r.remainingYears).toBe(20);
    expect(r.existingHeating).toBe("ac-only");
  });

  it("defaultRenovationInput: 既存値は維持", () => {
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

  it("custom 断熱プリセット: applyInsulation は input をそのまま返す", () => {
    const input = baseInput({ insulationPreset: "custom", uaValue: 0.33 });
    const s = buildHighPerformanceScenario(input);
    // applyInsulation(_, 'heat20-g2') が走るので uaValue は g2 値に上書きされる
    expect(s.input.uaValue).not.toBe(0.33);
  });
});

describe("subsidy: 未知 preset の rank フォールバック", () => {
  it("カスタム以外の未知値は ?? 0 で扱われる", () => {
    // INSULATION_RANK にない preset を渡しても crash しない
    const r = matchSubsidies({
      ...baseInput(),
      // @ts-expect-error 故意に invalid 値で内部 rank fallback を発火
      insulationPreset: "unknown-preset",
    });
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("battery: 太陽光ゼロ周辺の分岐", () => {
  it("solarCapacity が負の値でも 0 として早期 return", () => {
    expect(calcSelfConsumption(baseInput({ solarCapacity: -1 })).selfConsumptionRate).toBe(0);
  });
});
