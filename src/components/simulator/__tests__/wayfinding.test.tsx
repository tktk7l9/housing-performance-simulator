/**
 * SHIG 59 / 60 / 82 / 20 / 1: wayfinding, escape hatches and a compact step list on mobile.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulatorApp } from "../SimulatorApp";
import { TrailSidebar } from "../TrailSidebar";
import NotFound from "@/app/not-found";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  useHousingStore.setState({
    currentStep: 1,
    visitedSteps: new Set([0, 1]),
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    result: null,
    isCalculating: false,
    savedSimulations: [],
  });
});

describe("SimulatorApp header", () => {
  it("links back to the top page with the app name", () => {
    render(<SimulatorApp />);
    const home = screen.getByRole("link", { name: "住宅性能シミュレーター" });
    expect(home.getAttribute("href")).toBe("/");
  });
});

describe("TrailSidebar", () => {
  it("marks the current step with aria-current", () => {
    render(<TrailSidebar />);
    const current = screen.getByRole("button", { name: /2\. 住宅性能/ });
    expect(current.getAttribute("aria-current")).toBe("step");
    const other = screen.getByRole("button", { name: /1\. 建物条件/ });
    expect(other.getAttribute("aria-current")).toBeNull();
  });

  it("has a compact progress toggle for small screens", () => {
    render(<TrailSidebar />);
    const toggle = screen.getByRole("button", { name: /ステップ 2 \/ 6/ });
    expect(toggle.textContent).toContain("住宅性能");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // Choosing a step closes the list again
    fireEvent.click(screen.getByRole("button", { name: /3\. 設備/ }));
    expect(useHousingStore.getState().currentStep).toBe(2);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides the renovation summary until the step has been filled", () => {
    useHousingStore.setState({
      currentStep: 0,
      visitedSteps: new Set([0, 1]),
      input: { ...DEFAULT_INPUT, mode: "renovation", renovation: undefined },
    });
    render(<TrailSidebar />);
    expect(screen.queryByText(/0項目/)).toBeNull();
  });
});

describe("not-found page", () => {
  it("offers links back to the top page and the simulator", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /トップ/ }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: /シミュレーター/ }).getAttribute("href")).toBe("/simulator");
  });
});
