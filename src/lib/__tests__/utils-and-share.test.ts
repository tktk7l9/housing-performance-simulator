import { describe, it, expect } from "vitest";
import { cn, formatYen, formatManYen, formatKwh, formatKg, formatYears } from "../utils";
import { encodeInput, decodeInput } from "../share/encoder";
import type { HousingInput } from "../housing/types";

describe("utils", () => {
  it("cn: joins classes and resolves Tailwind conflicts", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("cn: handles falsy values and object syntax", () => {
    expect(cn("a", false, null, undefined, { foo: true })).toContain("foo");
  });
  it("formatYen: rounds to an integer with thousands separators", () => {
    expect(formatYen(1234.7)).toBe("1,235円");
  });
  it("formatManYen: rounds to man-yen (万円) with one decimal", () => {
    // 1,234,567 yen -> 123.5 man-yen (万円)
    expect(formatManYen(1234567)).toBe("123.5万円");
  });
  it("formatKwh", () => {
    expect(formatKwh(1234.5)).toBe("1,235 kWh");
  });
  it("formatKg", () => {
    expect(formatKg(1234.5)).toBe("1,235 kg");
  });
  it("formatYears: finite numbers get one decimal", () => {
    expect(formatYears(7.34)).toBe("7.3 年");
  });
  it("formatYears: Infinity / negative / NaN become '—'", () => {
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

  it("encodeInput -> decodeInput round-trips", () => {
    const token = encodeInput(input);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    const back = decodeInput(token);
    expect(back?.floorArea).toBe(130);
    expect(back?.insulationPreset).toBe("heat20-g2");
    expect(back?.hems).toBe(true);
    expect(back?.appliedSubsidyIds).toEqual(["zeh"]);
  });

  it("decodes a token whose '+' arrived percent-encoded from the route param", () => {
    // Find an input whose token contains '+', as real share links usually do
    let token = "";
    for (let area = 30; area <= 500 && !token.includes("+"); area++) {
      token = encodeInput({ ...input, floorArea: area });
    }
    expect(token).toContain("+");
    const fromParams = token.replace(/\+/g, "%2B");
    expect(decodeInput(fromParams)).toEqual(decodeInput(token));
    expect(decodeInput(fromParams)).not.toBeNull();
  });

  it("falls back to the raw token when percent-decoding fails", () => {
    expect(decodeInput("%E0%A4%A")).toBeNull();
  });

  it("decodeInput: an invalid token returns null", () => {
    expect(decodeInput("!!!invalid!!!")).toBeNull();
  });

  it("decodeInput: an empty string returns null", () => {
    expect(decodeInput("")).toBeNull();
  });

  it("decodeInput: unparsable JSON returns null", () => {
    // LZString fails to decompress -> null -> early return null
    expect(decodeInput("ZZZ")).toBeNull();
  });
});
