/**
 * Smoke tests for basic rendering and event handling of each step component.
 * Radix Select does not fully work in jsdom, so only the on-screen label/title are checked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuildingStep } from "../steps/BuildingStep";
import { PerformanceStep } from "../steps/PerformanceStep";
import { EquipmentStep } from "../steps/EquipmentStep";
import { EconomyStep } from "../steps/EconomyStep";
import { ScenarioStep } from "../steps/ScenarioStep";
import { ResultsStep } from "../steps/ResultsStep";
import { RenovationStep } from "../steps/RenovationStep";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

// ── Recharts: ResponsiveContainer depends on ResizeObserver. Mock ─────
vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

// The PDF renderer is heavy in jsdom and unnecessary, so stub it
vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (s: object) => s },
  PDFDownloadLink: ({ children }: { children: React.ReactNode | ((p: { loading: boolean }) => React.ReactNode) }) => {
    const child = typeof children === "function" ? (children as (p: { loading: boolean }) => React.ReactNode)({ loading: false }) : children;
    return <a href="#">{child}</a>;
  },
  pdf: () => ({ toBlob: () => Promise.resolve(new Blob()) }),
  Font: { register: () => {} },
}));

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

function setMode(mode: "new-build" | "renovation") {
  useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode } });
}

describe("BuildingStep", () => {
  it("renders the title", () => {
    render(<BuildingStep onNext={() => {}} />);
    expect(screen.getByText("建物条件")).toBeTruthy();
  });

  it("changes the floor area input", () => {
    render(<BuildingStep onNext={() => {}} />);
    const floorArea = screen.getByDisplayValue("120") as HTMLInputElement;
    fireEvent.change(floorArea, { target: { value: "150" } });
    expect(useHousingStore.getState().input.floorArea).toBe(150);
  });

  it("changes the household input", () => {
    render(<BuildingStep onNext={() => {}} />);
    const household = screen.getByDisplayValue("4") as HTMLInputElement;
    fireEvent.change(household, { target: { value: "5" } });
    expect(useHousingStore.getState().input.household).toBe(5);
  });

  it("the next button calls onNext", () => {
    const onNext = vi.fn();
    render(<BuildingStep onNext={onNext} onBack={() => {}} />);
    fireEvent.click(screen.getByText("次へ"));
    expect(onNext).toHaveBeenCalled();
  });
});

describe("PerformanceStep", () => {
  it("renders the insulation title", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/断熱性能|断熱仕様|断熱/).length).toBeGreaterThan(0);
  });

  it("changes the UA value input", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    // 0.87 is the default UA value
    const uaInput = screen.getByDisplayValue("0.87") as HTMLInputElement;
    fireEvent.change(uaInput, { target: { value: "0.46" } });
    expect(useHousingStore.getState().input.uaValue).toBeCloseTo(0.46);
  });
});

describe("EquipmentStep", () => {
  it("renders the equipment title", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/設備|機器/).length).toBeGreaterThan(0);
  });

  it("changes the solar capacity input", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const solar = screen.getByDisplayValue("5") as HTMLInputElement;
    fireEvent.change(solar, { target: { value: "8" } });
    expect(useHousingStore.getState().input.solarCapacity).toBe(8);
  });
});

describe("EconomyStep", () => {
  it("renders the economy title", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/経済|料金/).length).toBeGreaterThan(0);
  });

  it("changes the electricity price input", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const ePrice = screen.getByDisplayValue("32") as HTMLInputElement;
    fireEvent.change(ePrice, { target: { value: "40" } });
    expect(useHousingStore.getState().input.electricityPriceBuy).toBe(40);
  });
});

describe("ScenarioStep", () => {
  it("renders the scenario title", () => {
    render(<ScenarioStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/シナリオ|比較/).length).toBeGreaterThan(0);
  });
});

describe("ResultsStep", () => {
  it("shows results after calculation", () => {
    useHousingStore.getState().calculate();
    render(<ResultsStep onBack={() => {}} />);
    expect(screen.getByText(/結果|総合評価|結論/)).toBeTruthy();
  });

  it("does not crash before calculation (it may autorun)", () => {
    expect(() => render(<ResultsStep onBack={() => {}} />)).not.toThrow();
  });
});

describe("RenovationStep", () => {
  it("shows the title in renovation mode", () => {
    setMode("renovation");
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/リフォーム|改修/).length).toBeGreaterThan(0);
  });
});
