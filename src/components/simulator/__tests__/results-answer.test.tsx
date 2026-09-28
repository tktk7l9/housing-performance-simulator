/**
 * SHIG 20 / 28 / 96 / 1 / 6: the results page answers "which option is cheapest" in text.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ScenarioComparison, cheapestScenario } from "../results/ScenarioComparison";
import { SensitivityChart } from "../results/SensitivityChart";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { DEFAULT_INPUT } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
  };
});

const output = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));

describe("cheapestScenario", () => {
  it("returns the scenario with the lowest cumulative total", () => {
    const min = Math.min(...output.scenarios.map((s) => s.cumulativeTotal));
    expect(cheapestScenario(output)?.cumulativeTotal).toBe(min);
  });

  it("returns undefined for an empty output", () => {
    expect(cheapestScenario({ ...output, scenarios: [] })).toBeUndefined();
  });
});

describe("ScenarioComparison summary", () => {
  it("states the cheapest scenario in one line", () => {
    render(<ScenarioComparison output={output} />);
    const cheapest = cheapestScenario(output)!;
    const summary = screen.getByTestId("cheapest-summary");
    expect(summary.textContent).toContain(`${DEFAULT_INPUT.livingYears}年累計が最も低い`);
    expect(summary.textContent).toContain(cheapest.scenarioName);
  });

  it("marks exactly one card with a text badge (not colour only)", () => {
    render(<ScenarioComparison output={output} />);
    expect(screen.getAllByText("累計が最も低い")).toHaveLength(1);
  });

  it("does not render placeholder dashes for the baseline card", () => {
    render(<ScenarioComparison output={output} />);
    const baselineCard = screen.getByTestId(`scenario-card-${output.baselineId}`);
    expect(within(baselineCard).queryByText("—")).toBeNull();
    expect(within(baselineCard).queryByText("投資回収")).toBeNull();
  });
});

describe("SensitivityChart caption", () => {
  it("uses the user's living years instead of a hard-coded 30", () => {
    render(<SensitivityChart input={{ ...DEFAULT_INPUT, livingYears: 20 }} />);
    expect(screen.getByText(/20 年累計コスト変化/)).toBeTruthy();
    expect(screen.queryByText(/30 年累計コスト変化/)).toBeNull();
  });
});

describe("InitialCostBreakdown", () => {
  it("omits rows that are zero for every scenario", () => {
    render(<InitialCostBreakdown output={output} />);
    // New-build scenarios have no renovation work
    expect(screen.queryByText("リフォーム工事費")).toBeNull();
    expect(screen.getByText("合計（補助後）")).toBeTruthy();
  });
});
