/**
 * SHIG 57 / 54 / 38 / 55 / 16 / 78: act without confirmation, offer undo, never lose user input silently.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SavedList } from "../SavedList";
import { ToastHost } from "../ToastHost";
import { BuildingStep } from "../steps/BuildingStep";
import { PdfExportButton } from "../results/PdfExportButton";
import { SharedView } from "@/app/share/[token]/SharedView";
import { useToastStore } from "@/store/toastStore";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";
import { encodeInput } from "@/lib/share/encoder";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";
import type { SavedSimulation } from "@/lib/housing/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const pdfMock = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: (s: object) => s },
  pdf: () => pdfMock(),
  Font: { register: () => {} },
}));

function saved(id: string, name: string): SavedSimulation {
  return { id, name, savedAt: new Date().toISOString(), schemaVersion: 2, input: DEFAULT_INPUT };
}

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  useToastStore.setState({ toasts: [] });
  useHousingStore.setState({
    currentStep: 0,
    visitedSteps: new Set([0]),
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    result: null,
    isCalculating: false,
    savedSimulations: [saved("a", "A"), saved("b", "B"), saved("c", "C")],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast store", () => {
  it("show adds a toast and dismiss removes it", () => {
    const id = useToastStore.getState().show({ message: "hello" });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe("ToastHost", () => {
  it("runs the action and closes", () => {
    const onAction = vi.fn();
    render(<ToastHost />);
    act(() => {
      useToastStore.getState().show({ message: "削除しました", actionLabel: "元に戻す", onAction });
    });
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("削除しました")).toBeNull();
  });

  it("can be closed and expires on its own", () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    act(() => {
      useToastStore.getState().show({ message: "one" });
    });
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("one")).toBeNull();
    act(() => {
      useToastStore.getState().show({ message: "two" });
    });
    expect(screen.getByText("two")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText("two")).toBeNull();
  });
});

describe("store: deleteSaved / restoreSaved", () => {
  it("returns the removed entry with its index and restores it in place", () => {
    const removed = useHousingStore.getState().deleteSaved("b")!;
    expect(removed.index).toBe(1);
    expect(useHousingStore.getState().savedSimulations.map((s) => s.id)).toEqual(["a", "c"]);
    useHousingStore.getState().restoreSaved(removed.entry, removed.index);
    expect(useHousingStore.getState().savedSimulations.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("returns undefined for an unknown id", () => {
    expect(useHousingStore.getState().deleteSaved("zzz")).toBeUndefined();
  });

  it("does not duplicate an entry that is already present", () => {
    const entry = useHousingStore.getState().savedSimulations[0];
    useHousingStore.getState().restoreSaved(entry, 0);
    expect(useHousingStore.getState().savedSimulations).toHaveLength(3);
  });
});

describe("SavedList delete", () => {
  it("deletes without confirm and offers undo", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <>
        <SavedList />
        <ToastHost />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "「B」を削除" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(useHousingStore.getState().savedSimulations.map((s) => s.id)).toEqual(["a", "c"]);
    expect(screen.getByText("「B」を削除しました")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    expect(useHousingStore.getState().savedSimulations.map((s) => s.id)).toEqual(["a", "b", "c"]);
    confirmSpy.mockRestore();
  });
});

describe("BuildingStep mode switch", () => {
  it("offers undo that restores progress and scenario selection", () => {
    useHousingStore.setState({ currentStep: 0, visitedSteps: new Set([0, 1, 2, 3]), selectedScenarioIds: ["preset-baseline", "user"] });
    render(
      <>
        <BuildingStep onNext={() => {}} />
        <ToastHost />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: /既築リフォーム/ }));
    expect(useHousingStore.getState().input.mode).toBe("renovation");
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    const s = useHousingStore.getState();
    expect(s.input.mode).toBe("new-build");
    expect(s.visitedSteps).toEqual(new Set([0, 1, 2, 3]));
    expect(s.selectedScenarioIds).toEqual(["preset-baseline", "user"]);
  });

  it("does nothing when the same mode is chosen", () => {
    render(
      <>
        <BuildingStep onNext={() => {}} />
        <ToastHost />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: /新築/ }));
    expect(screen.queryByRole("button", { name: "元に戻す" })).toBeNull();
  });
});

describe("SharedView", () => {
  it("shows a constructive message for a broken link", () => {
    render(<SharedView token="broken!!!" />);
    expect(replace).toHaveBeenCalledWith("/simulator");
    const msg = useToastStore.getState().toasts[0];
    expect(msg.tone).toBe("error");
    expect(msg.message).toContain("共有リンクを読み込めませんでした");
  });

  it("keeps the receiver's own input in 保存済み before overwriting, with undo", () => {
    useHousingStore.setState({ savedSimulations: [], input: { ...DEFAULT_INPUT, floorArea: 222 } });
    render(<SharedView token={encodeInput({ ...DEFAULT_INPUT, floorArea: 90 })} />);
    const s = useHousingStore.getState();
    expect(s.input.floorArea).toBe(90);
    expect(s.savedSimulations[0].name).toBe("共有リンクを開く前の入力");
    expect(s.savedSimulations[0].input.floorArea).toBe(222);
    const toast = useToastStore.getState().toasts[0];
    act(() => toast.onAction!());
    expect(useHousingStore.getState().input.floorArea).toBe(222);
  });

  it("does not create a backup when the current input is untouched", () => {
    useHousingStore.setState({ savedSimulations: [] });
    render(<SharedView token={encodeInput({ ...DEFAULT_INPUT, floorArea: 90 })} />);
    expect(useHousingStore.getState().savedSimulations).toHaveLength(0);
  });
});

describe("PdfExportButton failure", () => {
  it("shows an inline error instead of failing silently", async () => {
    pdfMock.mockReturnValue({ toBlob: () => Promise.reject(new Error("boom")) });
    const output = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdfExportButton output={output} />);
    fireEvent.click(screen.getByText(/PDF を保存/).closest("button")!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("PDF を作成できませんでした"));
  });
});
