/**
 * Results 系コンポーネントの smoke test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvaluationCard } from "../results/EvaluationCard";
import { ScenarioComparison } from "../results/ScenarioComparison";
import { CumulativeCostChart } from "../results/CumulativeCostChart";
import { AnnualCostBreakdown } from "../results/AnnualCostBreakdown";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { AssumptionsPanel } from "../results/AssumptionsPanel";
import { SensitivityChart } from "../results/SensitivityChart";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";
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

beforeEach(() => {
  localStorage.clear();
  useHousingStore.setState({
    currentStep: 0,
    visitedSteps: new Set([0]),
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    result: null,
    isCalculating: false,
    savedSimulations: [],
  });
});

function getResult() {
  return runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));
}

describe("EvaluationCard", () => {
  it("評価結果を表示", () => {
    const result = getResult();
    render(<EvaluationCard output={result} />);
    expect(screen.getAllByText(/総合評価|スコア|評価|総評/).length).toBeGreaterThan(0);
  });

  it("空シナリオの場合は null 返却で何も描画されない", () => {
    const empty = { ...getResult(), scenarios: [] };
    const { container } = render(<EvaluationCard output={empty} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ScenarioComparison", () => {
  it("シナリオ表示", () => {
    const result = getResult();
    expect(() => render(<ScenarioComparison output={result} />)).not.toThrow();
  });
});

describe("CumulativeCostChart", () => {
  it("グラフコンテナ描画", () => {
    const result = getResult();
    render(<CumulativeCostChart scenarios={result.scenarios} livingYears={DEFAULT_INPUT.livingYears} />);
    expect(screen.getAllByTestId("rc").length).toBeGreaterThan(0);
  });
});

describe("AnnualCostBreakdown", () => {
  it("年間コスト表示", () => {
    const result = getResult();
    expect(() => render(
      <AnnualCostBreakdown
        scenarios={result.scenarios}
        electricityPrice={DEFAULT_INPUT.electricityPriceBuy}
        gasPrice={DEFAULT_INPUT.gasPrice}
        sellPriceFit={DEFAULT_INPUT.sellPriceFit}
      />
    )).not.toThrow();
  });
});

describe("InitialCostBreakdown", () => {
  it("初期費用内訳表示", () => {
    const result = getResult();
    expect(() => render(<InitialCostBreakdown output={result} />)).not.toThrow();
  });
});

describe("AssumptionsPanel", () => {
  it("前提値パネル表示", () => {
    const result = getResult();
    expect(() => render(<AssumptionsPanel output={result} />)).not.toThrow();
  });
});

describe("SensitivityChart", () => {
  it("感度分析チャート表示", () => {
    expect(() => render(<SensitivityChart input={DEFAULT_INPUT} />)).not.toThrow();
  });
});
