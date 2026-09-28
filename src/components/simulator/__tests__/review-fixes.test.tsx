/**
 * Regressions found in the adversarial review of the SHIG round-2 changes:
 * - a share-link backup must never evict another saved simulation, and undo must restore it all
 * - share tokens arrive percent-encoded from the route param
 * - after deleting with the keyboard, focus lands on undo; the toast stays while focused
 * - a calculation failure shows a retry instead of an endless "calculating" message
 * - small targets reach 44px (SHIG 13 / 78)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SavedList } from "../SavedList";
import { ToastHost, TOAST_DURATION_MS } from "../ToastHost";
import { TrailSidebar } from "../TrailSidebar";
import { ResultsStep } from "../steps/ResultsStep";
import { SharedView } from "@/app/share/[token]/SharedView";
import { useToastStore } from "@/store/toastStore";
import { useHousingStore, DEFAULT_INPUT, SAVED_LIMIT, defaultSelectedScenarios } from "@/store/housingStore";
import { encodeInput } from "@/lib/share/encoder";
import type { SavedSimulation } from "@/lib/housing/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const failNext = { value: false };
vi.mock("@/lib/housing/calculator", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    runSimulation: (...args: unknown[]) => {
      if (failNext.value) throw new Error("boom");
      return (actual.runSimulation as (...a: unknown[]) => unknown)(...args);
    },
  };
});

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

function saved(id: string, name: string): SavedSimulation {
  return { id, name, savedAt: new Date().toISOString(), schemaVersion: 2, input: DEFAULT_INPUT };
}

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  failNext.value = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
  useToastStore.setState({ toasts: [] });
  useHousingStore.setState({
    currentStep: 0,
    visitedSteps: new Set([0]),
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    result: null,
    isCalculating: false,
    calculateFailed: false,
    savedSimulations: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SharedView backup", () => {
  it("does not evict a saved simulation when the list is full, and undo still restores everything", () => {
    const full = Array.from({ length: SAVED_LIMIT }, (_, i) => saved(`s${i}`, `S${i}`));
    useHousingStore.setState({
      savedSimulations: full,
      input: { ...DEFAULT_INPUT, floorArea: 222 },
      selectedScenarioIds: ["preset-baseline", "user"],
      currentStep: 2,
      visitedSteps: new Set([0, 1, 2]),
    });
    render(<SharedView token={encodeInput({ ...DEFAULT_INPUT, floorArea: 90 })} />);

    let s = useHousingStore.getState();
    expect(s.input.floorArea).toBe(90);
    expect(s.savedSimulations.map((x) => x.id)).toEqual(full.map((x) => x.id));

    const toast = useToastStore.getState().toasts[0];
    expect(toast.message).toContain("元に戻す");
    act(() => toast.onAction!());
    s = useHousingStore.getState();
    expect(s.input.floorArea).toBe(222);
    expect(s.selectedScenarioIds).toEqual(["preset-baseline", "user"]);
    expect(s.currentStep).toBe(2);
    expect(s.visitedSteps).toEqual(new Set([0, 1, 2]));
    expect(s.result).toBeNull();
  });

  it("still keeps a durable copy in 保存済み when there is room", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, floorArea: 222 } });
    render(<SharedView token={encodeInput({ ...DEFAULT_INPUT, floorArea: 90 })} />);
    const s = useHousingStore.getState();
    expect(s.savedSimulations).toHaveLength(1);
    expect(s.savedSimulations[0].input.floorArea).toBe(222);
    expect(useToastStore.getState().toasts[0].message).toContain("保存済み");
  });

  it("loads a token whose '+' came through the route param as %2B", () => {
    let token = "";
    for (let area = 30; area <= 500 && !token.includes("+"); area++) {
      token = encodeInput({ ...DEFAULT_INPUT, floorArea: area });
    }
    render(<SharedView token={token.replace(/\+/g, "%2B")} />);
    expect(useToastStore.getState().toasts.filter((t) => t.tone === "error")).toHaveLength(0);
    expect(useHousingStore.getState().input).not.toEqual(DEFAULT_INPUT);
  });
});

describe("keyboard delete and undo", () => {
  it("moves focus to undo when the delete button had focus", () => {
    useHousingStore.setState({ savedSimulations: [saved("a", "A"), saved("b", "B")] });
    render(
      <>
        <SavedList />
        <ToastHost />
      </>
    );
    const del = screen.getByRole("button", { name: "「A」を削除" });
    del.focus();
    fireEvent.click(del);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "元に戻す" }));
  });

  it("does not steal focus when the delete button was not focused", () => {
    useHousingStore.setState({ savedSimulations: [saved("a", "A")] });
    render(
      <>
        <SavedList />
        <ToastHost />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "「A」を削除" }));
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps the toast open while it holds focus and lets it expire after focus leaves", () => {
    vi.useFakeTimers();
    render(
      <>
        <button type="button">outside</button>
        <ToastHost />
      </>
    );
    act(() => {
      useToastStore.getState().show({ message: "held", actionLabel: "元に戻す", onAction: () => {}, focusAction: true });
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS * 3);
    });
    expect(screen.getByText("held")).toBeTruthy();
    act(() => {
      screen.getByRole("button", { name: "outside" }).focus();
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS + 1);
    });
    expect(screen.queryByText("held")).toBeNull();
  });

  it("keeps the toast open while hovered", () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    act(() => {
      useToastStore.getState().show({ message: "hover" });
    });
    fireEvent.mouseEnter(screen.getByText("hover").parentElement!);
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS * 2);
    });
    expect(screen.getByText("hover")).toBeTruthy();
    fireEvent.mouseLeave(screen.getByText("hover").parentElement!);
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS + 1);
    });
    expect(screen.queryByText("hover")).toBeNull();
  });
});

describe("ResultsStep calculation failure", () => {
  it("shows a retry and a way back instead of spinning forever", () => {
    failNext.value = true;
    const onBack = vi.fn();
    render(<ResultsStep onBack={onBack} />);
    expect(screen.getByRole("alert").textContent).toContain("計算できませんでした");
    fireEvent.click(screen.getByRole("button", { name: "入力に戻る" }));
    expect(onBack).toHaveBeenCalledTimes(1);

    failNext.value = false;
    fireEvent.click(screen.getByRole("button", { name: "もう一度計算する" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(useHousingStore.getState().result).not.toBeNull();
    expect(useHousingStore.getState().calculateFailed).toBe(false);
  });
});

describe("target sizes (SHIG 13 / 78)", () => {
  it("gives the 保存済み toggle and the back link a 44px minimum height", () => {
    render(<TrailSidebar />);
    expect(screen.getByRole("button", { name: /保存済み/ }).className).toContain("min-h-11");

    useHousingStore.getState().calculate();
    render(<ResultsStep onBack={() => {}} />);
    expect(screen.getByRole("button", { name: "← 入力を変更する" }).className).toContain("min-h-11");
  });
});
