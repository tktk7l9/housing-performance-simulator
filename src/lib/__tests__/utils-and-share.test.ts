import { describe, it, expect } from "vitest";
import { cn, formatYen, formatManYen, formatKwh, formatKg, formatYears } from "../utils";
import { encodeInput, decodeInput } from "../share/encoder";
import type { HousingInput } from "../housing/types";

describe("utils", () => {
  it("cn: クラス結合 + Tailwind 衝突解決", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("cn: falsy・オブジェクト形式", () => {
    expect(cn("a", false, null, undefined, { foo: true })).toContain("foo");
  });
  it("formatYen: 整数化＋3桁区切り", () => {
    expect(formatYen(1234.7)).toBe("1,235円");
  });
  it("formatManYen: 千円単位を万円・小数1桁に丸める", () => {
    // 1234567円 → 123.5 万円
    expect(formatManYen(1234567)).toBe("123.5万円");
  });
  it("formatKwh", () => {
    expect(formatKwh(1234.5)).toBe("1,235 kWh");
  });
  it("formatKg", () => {
    expect(formatKg(1234.5)).toBe("1,235 kg");
  });
  it("formatYears: 有限数値は 1桁", () => {
    expect(formatYears(7.34)).toBe("7.3 年");
  });
  it("formatYears: Infinity / 負数 / NaN は '—'", () => {
    expect(formatYears(Infinity)).toBe("—");
    expect(formatYears(-1)).toBe("—");
    expect(formatYears(NaN)).toBe("—");
  });
});

describe("share/encoder", () => {
  const input: HousingInput = {
    mode: "new-build",
    floorArea: 130,
    region: 5,
    household: 3,
    presence: "all-day",
    livingYears: 25,
    insulationPreset: "heat20-g2",
    uaValue: 0.46,
    cValue: 1.0,
    windowSpec: "resin-pair-lowe",
    solarCapacity: 5,
    solarOrientation: "south",
    solarTilt: 30,
    batteryCapacity: 7,
    waterHeater: "eco-cute",
    heating: "ac-only",
    hems: true,
    electricityPriceBuy: 35,
    gasPrice: 220,
    sellPriceFit: 15,
    sellPricePostFit: 8,
    electricityRise: "moderate",
    appliedSubsidyIds: ["zeh"],
  };

  it("encodeInput → decodeInput ラウンドトリップ", () => {
    const token = encodeInput(input);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    const back = decodeInput(token);
    expect(back?.floorArea).toBe(130);
    expect(back?.insulationPreset).toBe("heat20-g2");
    expect(back?.hems).toBe(true);
    expect(back?.appliedSubsidyIds).toEqual(["zeh"]);
  });

  it("decodeInput: 不正な token は null", () => {
    expect(decodeInput("!!!invalid!!!")).toBeNull();
  });

  it("decodeInput: 空文字も null", () => {
    expect(decodeInput("")).toBeNull();
  });

  it("decodeInput: JSON.parse できない文字列は catch で null", () => {
    // LZString は decompress に失敗 → null → 早期 return null
    expect(decodeInput("ZZZ")).toBeNull();
  });
});
