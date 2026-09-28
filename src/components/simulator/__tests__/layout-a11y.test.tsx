/**
 * SHIG 94 / 85 / 95 / 52: named controls and a cost table that stays readable at narrow widths.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EquipmentStep } from "../steps/EquipmentStep";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

beforeEach(() => {
  useHousingStore.setState({
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    result: null,
  });
});

describe("EquipmentStep HEMS switch", () => {
  it("is announced with its label", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sw = screen.getByRole("switch", { name: /HEMS/ });
    expect(sw.getAttribute("id")).toBe("hems");
  });
});

describe("InitialCostBreakdown layout", () => {
  const output = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));

  it("keeps the row-label column sticky and wide enough not to wrap per character", () => {
    render(<InitialCostBreakdown output={output} />);
    const label = screen.getByText("太陽光発電");
    expect(label.className).toContain("sticky");
    expect(label.className).toContain("whitespace-nowrap");
  });

  it("hints that the table scrolls sideways", () => {
    render(<InitialCostBreakdown output={output} />);
    expect(screen.getByText(/横にスクロール/)).toBeTruthy();
  });
});
