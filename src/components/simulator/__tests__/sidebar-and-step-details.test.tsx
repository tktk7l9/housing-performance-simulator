/**
 * Details of the trail sidebar, the renovation / building steps, the results
 * header actions and the toast timer that the broader suites do not reach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { TrailSidebar } from "../TrailSidebar";
import { ToastHost, TOAST_DURATION_MS } from "../ToastHost";
import { RenovationStep } from "../steps/RenovationStep";
import { BuildingStep } from "../steps/BuildingStep";
import { ResultsStep } from "../steps/ResultsStep";
import { SimulatorApp } from "../SimulatorApp";
import { ShareUrlButton } from "../results/ShareUrlButton";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { splitLabel } from "../results/chartLabels";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";
import { useToastStore } from "@/store/toastStore";
import { defaultRenovationInput } from "@/lib/housing/presets";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";
import { RENOVATION_ITEMS, estimateOpenings } from "@/lib/housing/data/renovationCosts";
import { SUBSIDIES } from "@/lib/housing/data/subsidies";
import { formatManYen } from "@/lib/utils";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="rc">{children}</div>,
  };
});

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (s: object) => s },
  pdf: () => ({ toBlob: () => Promise.resolve(new Blob()) }),
  Font: { register: () => {} },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
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
  useToastStore.setState({ toasts: [] });
});

describe("TrailSidebar summaries", () => {
  it("renovation step shows no summary until the step has been filled (SHIG 1)", () => {
    act(() => useHousingStore.getState().setMode("renovation"));
    useHousingStore.setState({ visitedSteps: new Set([0, 1]) });
    render(<TrailSidebar />);
    const item = screen.getByRole("button", { name: /現状とリフォーム計画/ });
    expect(item.textContent).not.toMatch(/項目/);
  });

  it("renovation summary lists the age bracket and the number of chosen items", () => {
    act(() => useHousingStore.getState().setMode("renovation"));
    const input = useHousingStore.getState().input;
    act(() =>
      useHousingStore.getState().updateInput({
        renovation: { ...defaultRenovationInput(input), items: ["inner-window", "floor-insulation"] },
      })
    );
    useHousingStore.setState({ visitedSteps: new Set([0, 1]) });
    render(<TrailSidebar />);
    const item = screen.getByRole("button", { name: /現状とリフォーム計画/ });
    expect(item.textContent).toContain("1980-1999 / 2項目");
  });

  it("saved section shows a count once something is saved and opens the list", () => {
    act(() => {
      useHousingStore.getState().calculate();
      useHousingStore.getState().saveCurrent("南向きプラン");
    });
    render(<TrailSidebar />);
    const toggle = screen.getByRole("button", { name: /保存済み/ });
    expect(toggle.textContent).toContain("(1)");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("南向きプラン")).toBeTruthy();
  });
});

describe("RenovationStep estimate", () => {
  beforeEach(() => {
    act(() => useHousingStore.getState().setMode("renovation"));
  });

  it("adds per-opening and lump-sum items to the estimated total", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const openings = estimateOpenings(useHousingStore.getState().input.floorArea);
    const hint = () => screen.getByText(/概算合計:/).textContent ?? "";
    expect(hint()).toContain(`概算合計: ${formatManYen(0)}`);

    const innerWindow = screen.getByText(RENOVATION_ITEMS["inner-window"].label).closest("label")!;
    fireEvent.click(within(innerWindow).getByRole("checkbox"));
    const expectedWindow = RENOVATION_ITEMS["inner-window"].unitCost * openings;
    expect(hint()).toContain(`概算合計: ${formatManYen(expectedWindow)}`);

    const airtight = screen.getByText(RENOVATION_ITEMS["airtight-improvement"].label).closest("label")!;
    fireEvent.click(within(airtight).getByRole("checkbox"));
    const expectedBoth = expectedWindow + RENOVATION_ITEMS["airtight-improvement"].unitCost;
    expect(hint()).toContain(`概算合計: ${formatManYen(expectedBoth)}`);
    expect(useHousingStore.getState().input.renovation?.items).toEqual(["inner-window", "airtight-improvement"]);

    // Unchecking removes the item again
    fireEvent.click(within(innerWindow).getByRole("checkbox"));
    expect(useHousingStore.getState().input.renovation?.items).toEqual(["airtight-improvement"]);
  });

  it("typing a current C value stores it", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const c = screen.getByLabelText(/現状 C 値/) as HTMLInputElement;
    fireEvent.change(c, { target: { value: "3.5" } });
    expect(useHousingStore.getState().input.renovation?.existingCValue).toBe(3.5);
  });
});

describe("BuildingStep living years", () => {
  it("typing the years to live there updates the input", () => {
    render(<BuildingStep onNext={() => {}} />);
    const years = screen.getByLabelText(/想定居住年数/) as HTMLInputElement;
    fireEvent.change(years, { target: { value: "35" } });
    expect(useHousingStore.getState().input.livingYears).toBe(35);
  });
});

describe("ResultsStep save action", () => {
  it("保存 opens the save dialog", () => {
    act(() => useHousingStore.getState().calculate());
    render(<ResultsStep onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("シミュレーションを保存")).toBeTruthy();
  });
});

describe("InitialCostBreakdown subsidy row", () => {
  it("shows the subsidy as a deduction when one is applied and a dash when none", () => {
    const subsidy = SUBSIDIES.find((s) => s.id === "battery-doe")!;
    const withSubsidy = { ...DEFAULT_INPUT, appliedSubsidyIds: [subsidy.id] };
    const output = runSimulation(withSubsidy, buildAllScenarios(withSubsidy));
    render(<InitialCostBreakdown output={output} />);
    const row = screen.getByText("補助金（控除）").closest("tr")!;
    expect(row.textContent).toContain(`-${formatManYen(subsidy.amount)}`);

    const none = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));
    const { unmount } = render(<InitialCostBreakdown output={none} />);
    const rows = screen.getAllByText("補助金（控除）").map((el) => el.closest("tr")!);
    expect(rows[rows.length - 1].textContent).toContain("—");
    unmount();
  });
});

describe("ToastHost timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays open while focused and closes after focus leaves", () => {
    act(() => {
      useToastStore.getState().show({ message: "削除しました", actionLabel: "元に戻す", onAction: () => {} });
    });
    render(<ToastHost />);
    const close = screen.getByRole("button", { name: "閉じる" });
    act(() => {
      close.focus();
      fireEvent.focus(close);
    });
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + 100));
    expect(screen.getByText("削除しました")).toBeTruthy();

    // Focus moving to the undo button inside the toast keeps it open
    const undo = screen.getByRole("button", { name: "元に戻す" });
    act(() => {
      fireEvent.blur(close, { relatedTarget: undo });
    });
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + 100));
    expect(screen.getByText("削除しました")).toBeTruthy();

    // Focus leaving the toast restarts the timer
    act(() => {
      fireEvent.blur(undo, { relatedTarget: document.body });
    });
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS + 100));
    expect(screen.queryByText("削除しました")).toBeNull();
  });
});

describe("SimulatorApp next / back", () => {
  it("次へ and 前へ move between steps and mark them visited", () => {
    render(<SimulatorApp />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("建物条件");
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(useHousingStore.getState().currentStep).toBe(1);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("住宅性能");
    fireEvent.click(screen.getByRole("button", { name: "前へ" }));
    expect(useHousingStore.getState().currentStep).toBe(0);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("建物条件");
    // A visited step keeps its check mark in the sidebar
    const nav = screen.getByRole("navigation", { name: "ステップ" });
    expect(within(nav).getByRole("button", { name: /2\. 住宅性能/ })).toBeTruthy();
    expect(useHousingStore.getState().visitedSteps.has(1)).toBe(true);
  });
});

describe("ShareUrlButton feedback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns to the idle label two seconds after copying", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareUrlButton input={DEFAULT_INPUT} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "共有URLをコピー" }));
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/share/"));
    expect(screen.getByRole("button", { name: "コピーしました" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByRole("button", { name: "共有URLをコピー" })).toBeTruthy();
  });
});

describe("splitLabel", () => {
  it("breaks an over-long token onto its own lines after flushing the current one", () => {
    expect(splitLabel("ab cdefgh", 4)).toEqual(["ab", "cdef", "gh"]);
    expect(splitLabel("断熱+太陽光", 3)).toEqual(["断熱+", "太陽光"]);
  });
});
