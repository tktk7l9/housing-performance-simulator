/**
 * SHIG 14 / 25 / 29 / 35: the results step must always reflect the current input.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ResultsStep } from "../steps/ResultsStep";
import { ScenarioStep } from "../steps/ScenarioStep";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

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

describe("store invalidates result when inputs change", () => {
  it("updateInput clears a previously calculated result", () => {
    useHousingStore.getState().calculate();
    expect(useHousingStore.getState().result).not.toBeNull();
    useHousingStore.getState().updateInput({ electricityPriceBuy: 60 });
    expect(useHousingStore.getState().result).toBeNull();
  });

  it("setAddress clears the result", () => {
    useHousingStore.getState().calculate();
    useHousingStore.getState().setAddress("北海道");
    expect(useHousingStore.getState().result).toBeNull();
  });

  it("toggleScenario and setSelectedScenarioIds clear the result", () => {
    useHousingStore.getState().calculate();
    useHousingStore.getState().toggleScenario("user");
    expect(useHousingStore.getState().result).toBeNull();
    useHousingStore.getState().calculate();
    useHousingStore.getState().setSelectedScenarioIds(["preset-baseline"]);
    expect(useHousingStore.getState().result).toBeNull();
  });
});

describe("ResultsStep auto-calculates", () => {
  it("calculates on mount when there is no result (reload / sidebar jump)", () => {
    render(<ResultsStep onBack={() => {}} />);
    expect(useHousingStore.getState().result).not.toBeNull();
    expect(screen.getByText("シミュレーション結果")).toBeTruthy();
    expect(screen.queryByText("今すぐ計算する")).toBeNull();
  });

  it("recomputes when input changes after calculation", () => {
    render(<ResultsStep onBack={() => {}} />);
    const before = useHousingStore.getState().result!;
    act(() => {
      useHousingStore.getState().updateInput({ electricityPriceBuy: 60 });
    });
    const after = useHousingStore.getState().result!;
    expect(after).not.toBeNull();
    expect(after.inputAtCalc.electricityPriceBuy).toBe(60);
    expect(after.scenarios[0].cumulativeTotal).not.toBe(before.scenarios[0].cumulativeTotal);
  });
});

describe("ScenarioStep next button", () => {
  it("is labelled 結果を見る (calculation happens automatically)", () => {
    const onNext = vi.fn();
    render(<ScenarioStep onNext={onNext} onBack={() => {}} />);
    act(() => {
      screen.getByText("結果を見る").click();
    });
    expect(onNext).toHaveBeenCalled();
  });
});
