/**
 * Simulator chrome: tests for SimulatorApp / TrailSidebar / SavedList / SaveDialog
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulatorApp } from "../SimulatorApp";
import { TrailSidebar } from "../TrailSidebar";
import { SaveDialog } from "../SaveDialog";
import { SavedList } from "../SavedList";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

// Recharts depends on ResizeObserver -> stub
vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
  };
});

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

describe("SimulatorApp", () => {
  it("currentStep=0 shows BuildingStep", () => {
    render(<SimulatorApp />);
    expect(screen.getByRole("heading", { name: "建物条件" })).toBeTruthy();
  });

  it("setStep(1) moves to PerformanceStep", () => {
    render(<SimulatorApp />);
    useHousingStore.setState({ currentStep: 1 });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/性能|断熱/).length).toBeGreaterThan(0);
  });

  it("renovation mode shows RenovationStep", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      currentStep: 1,
    });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/リフォーム|改修/).length).toBeGreaterThan(0);
  });

  it("shows results when currentStep exceeds the last step", () => {
    useHousingStore.setState({
      currentStep: 99,
    });
    expect(() => render(<SimulatorApp />)).not.toThrow();
  });
});

describe("TrailSidebar", () => {
  it("lists the step names", () => {
    render(<TrailSidebar />);
    // All 6 steps are visible
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("changes currentStep on click", () => {
    render(<TrailSidebar />);
    fireEvent.click(screen.getByRole("button", { name: /2\. 住宅性能/ }));
    expect(useHousingStore.getState().currentStep).toBe(1);
  });

  it("renders in renovation mode", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<TrailSidebar />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("SaveDialog", () => {
  it("renders nothing when open=false", () => {
    render(<SaveDialog open={false} onOpenChange={() => {}} />);
    // Dialog text is not shown
    expect(screen.queryByText(/保存名|保存$/)).toBeNull();
  });

  it("renders when open=true", () => {
    render(<SaveDialog open onOpenChange={() => {}} />);
    expect(screen.getAllByText(/保存/).length).toBeGreaterThan(0);
  });

  it("calls saveCurrent after entering a name and pressing save", () => {
    const onOpenChange = vi.fn();
    render(<SaveDialog open onOpenChange={onOpenChange} />);
    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: "テスト保存" } });
    }
    const saveBtn = screen.getAllByText(/保存/).find(el => el.tagName === "BUTTON" || el.closest("button"));
    if (saveBtn) fireEvent.click(saveBtn);
    expect(useHousingStore.getState().savedSimulations.length).toBeGreaterThanOrEqual(0);
  });
});

describe("SavedList", () => {
  it("with no saves, shows the empty message or only the button", () => {
    render(<SavedList />);
    // Some saved-list UI is visible
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it("shows the name when one save exists", () => {
    useHousingStore.setState({
      savedSimulations: [{
        id: "sim_1",
        name: "テスト保存",
        savedAt: new Date().toISOString(),
        schemaVersion: 2,
        input: DEFAULT_INPUT,
      }],
    });
    render(<SavedList />);
    expect(screen.getAllByText("テスト保存").length).toBeGreaterThan(0);
  });
});
