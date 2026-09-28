/**
 * SHIG 96 / 28 / 85: chart labels that do not rely on colour and do not get clipped.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { splitLabel, WrappedTick, signedManYen } from "../results/chartLabels";
import { dashFor } from "../results/CumulativeCostChart";

describe("splitLabel", () => {
  it("keeps short labels on one line", () => {
    expect(splitLabel("標準仕様", 8)).toEqual(["標準仕様"]);
  });
  it("breaks after '+' separators first", () => {
    expect(splitLabel("高性能+太陽光+蓄電池", 7)).toEqual(["高性能+", "太陽光+蓄電池"]);
  });
  it("falls back to fixed-width chunks", () => {
    expect(splitLabel("あいうえおかきくけこ", 4)).toEqual(["あいうえ", "おかきく", "けこ"]);
  });
  it("splits at spaces", () => {
    expect(splitLabel("電気料金 単価", 5)).toEqual(["電気料金", "単価"]);
  });
});

describe("WrappedTick", () => {
  it("renders one tspan per line", () => {
    const { container } = render(
      <svg>
        <WrappedTick x={10} y={10} payload={{ value: "高性能+太陽光+蓄電池" }} maxChars={7} anchor="middle" />
      </svg>
    );
    expect(container.querySelectorAll("tspan")).toHaveLength(2);
  });
  it("renders nothing without a payload", () => {
    const { container } = render(<svg><WrappedTick x={0} y={0} /></svg>);
    expect(container.querySelectorAll("tspan")).toHaveLength(0);
  });
});

describe("signedManYen", () => {
  it("prefixes a sign", () => {
    expect(signedManYen(12)).toBe("+12");
    expect(signedManYen(-3)).toBe("-3");
    expect(signedManYen(0)).toBe("0");
  });
});

describe("dashFor", () => {
  it("gives each scenario a distinct stroke pattern so lines differ without colour", () => {
    const patterns = [0, 1, 2, 3, 4].map(dashFor);
    expect(new Set(patterns).size).toBe(5);
  });
});
