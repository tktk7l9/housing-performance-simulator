/**
 * SHIG 55: the renovation results step must show numbers, not an error, when the
 * renovation step was skipped (sidebar jump, share link, persisted state).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsStep } from "../steps/ResultsStep";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

beforeEach(() => {
  useHousingStore.setState({
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    currentStep: 0,
    visitedSteps: new Set([0]),
    result: null,
    calculateFailed: false,
  });
});

describe("Renovation mode fail-safe", () => {
  it("calculates with seeded defaults when the renovation step was skipped", () => {
    useHousingStore.getState().setMode("renovation");
    expect(useHousingStore.getState().input.renovation).toBeUndefined();
    useHousingStore.getState().calculate();
    const s = useHousingStore.getState();
    expect(s.calculateFailed).toBe(false);
    expect(s.result?.baselineId).toBe("renovation-as-is");
    expect(s.input.renovation?.ageBracket).toBe("1980-1999");
  });

  it("results step shows numbers instead of an error in that state", () => {
    useHousingStore.getState().setMode("renovation");
    useHousingStore.setState({ currentStep: 4 });
    render(<ResultsStep onBack={() => {}} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/累計が最も低いのは/)).toBeTruthy();
  });
});

