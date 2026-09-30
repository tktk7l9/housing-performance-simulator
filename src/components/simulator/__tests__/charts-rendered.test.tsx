/**
 * Charts rendered at a fixed size so Recharts actually lays out axes, labels
 * and tooltips in jsdom. The ResponsiveContainer mock in the other suites
 * gives the charts no width, which leaves tick / tooltip formatters unexercised.
 */
import { describe, it, expect, vi } from "vitest";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CumulativeCostChart } from "../results/CumulativeCostChart";
import { AnnualCostBreakdown } from "../results/AnnualCostBreakdown";
import { SensitivityChart } from "../results/SensitivityChart";
import { DEFAULT_INPUT } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 320;

// Give the wrapped chart an explicit size instead of measuring the (zero-sized) jsdom box,
// and skip the bar grow-in animation so value labels are present right after render.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const Bar = (props: React.ComponentProps<typeof actual.Bar>) => <actual.Bar {...props} isAnimationActive={false} />;
  return {
    ...actual,
    Bar,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="rc">
        {isValidElement(children)
          ? cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
              width: CHART_WIDTH,
              height: CHART_HEIGHT,
            })
          : children}
      </div>
    ),
  };
});

function getResult() {
  return runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));
}

/** Hover the chart and wait for the tooltip to fill (Recharts applies it on the next frame). */
async function hoverChart(container: HTMLElement, clientX: number, clientY: number): Promise<string> {
  const wrapper = container.querySelector(".recharts-wrapper");
  if (!wrapper) throw new Error("chart wrapper not rendered");
  fireEvent.mouseEnter(wrapper, { clientX, clientY });
  fireEvent.mouseMove(wrapper, { clientX, clientY });
  let text = "";
  await waitFor(() => {
    text = container.querySelector(".recharts-tooltip-wrapper")?.textContent ?? "";
    expect(text).not.toBe("");
  });
  return text;
}

describe("CumulativeCostChart (laid out)", () => {
  it("shows year ticks and one legend entry per scenario", () => {
    const result = getResult();
    render(<CumulativeCostChart scenarios={result.scenarios} livingYears={DEFAULT_INPUT.livingYears} />);
    expect(screen.getAllByText(/\d+年目/).length).toBeGreaterThan(0);
    for (const s of result.scenarios) {
      expect(screen.getAllByText(s.scenarioName).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("万円")).toBeTruthy();
  });

  it("tooltip reports the hovered year in 万円", async () => {
    const result = getResult();
    const { container } = render(
      <CumulativeCostChart scenarios={result.scenarios} livingYears={DEFAULT_INPUT.livingYears} />
    );
    const text = await hoverChart(container, 300, 150);
    expect(text).toMatch(/\d+年目/);
    expect(text).toMatch(/万円/);
  });
});

describe("AnnualCostBreakdown (laid out)", () => {
  it("wraps scenario names on the axis and lists the four cost categories", () => {
    const result = getResult();
    render(
      <AnnualCostBreakdown
        scenarios={result.scenarios}
        electricityPrice={DEFAULT_INPUT.electricityPriceBuy}
        gasPrice={DEFAULT_INPUT.gasPrice}
        sellPriceFit={DEFAULT_INPUT.sellPriceFit}
      />
    );
    for (const label of ["暖冷房", "給湯", "その他家電", "売電収入"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("千円/年")).toBeTruthy();
  });

  it("tooltip shows values in 千円", async () => {
    const result = getResult();
    const { container } = render(
      <AnnualCostBreakdown
        scenarios={result.scenarios}
        electricityPrice={DEFAULT_INPUT.electricityPriceBuy}
        gasPrice={DEFAULT_INPUT.gasPrice}
        sellPriceFit={DEFAULT_INPUT.sellPriceFit}
      />
    );
    const text = await hoverChart(container, 200, 150);
    expect(text).toMatch(/千円/);
  });
});

describe("SensitivityChart (laid out)", () => {
  it("labels every bar with a signed value so direction does not rely on colour (SHIG 96)", () => {
    const { container } = render(<SensitivityChart input={DEFAULT_INPUT} />);
    const labels = Array.from(container.querySelectorAll(".recharts-label-list text")).map((n) => n.textContent ?? "");
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) expect(l).toMatch(/^[+-]?\d+$/);
    // x axis ticks are signed too
    expect(screen.getAllByText(/^\+\d+$/).length).toBeGreaterThan(0);
  });

  it("tooltip names the low / high setting and the centre value", async () => {
    const { container } = render(<SensitivityChart input={DEFAULT_INPUT} />);
    const text = await hoverChart(container, 320, 30);
    expect(text).toMatch(/中心:/);
    expect(text).toMatch(/万円/);
  });
});
