import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SavedList } from "../SavedList";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

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

describe("SavedList interactions", () => {
  it("空: メッセージ表示", () => {
    render(<SavedList />);
    expect(screen.getByText(/保存済みなし/)).toBeTruthy();
  });

  it("保存あり: summary 込みで表示・renovation ラベル", () => {
    useHousingStore.setState({
      savedSimulations: [
        {
          id: "sim_1",
          name: "テスト1",
          savedAt: new Date().toISOString(),
          schemaVersion: 2,
          input: { ...DEFAULT_INPUT, mode: "renovation" },
          summary: { cumulativeTotal: 1_500_000, initialCostNet: 500_000, livingYears: 30 },
        },
        {
          id: "sim_2",
          name: "テスト2",
          savedAt: new Date().toISOString(),
          schemaVersion: 2,
          input: { ...DEFAULT_INPUT, mode: "new-build" },
        },
      ],
    });
    render(<SavedList />);
    expect(screen.getByText("テスト1")).toBeTruthy();
    expect(screen.getByText("テスト2")).toBeTruthy();
    expect(screen.getAllByText(/リフォーム/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/新築/).length).toBeGreaterThan(0);
  });

  it("復元ボタンクリックで loadSaved + setTimeout(calculate)", () => {
    useHousingStore.setState({
      savedSimulations: [{
        id: "s1", name: "X", savedAt: new Date().toISOString(), schemaVersion: 2,
        input: { ...DEFAULT_INPUT, floorArea: 200 },
      }],
    });
    render(<SavedList />);
    const restore = screen.getByText(/復元/).closest("button")!;
    act(() => { fireEvent.click(restore); });
    expect(useHousingStore.getState().input.floorArea).toBe(200);
  });

  it("削除ボタン (confirm OK) で deleteSaved", () => {
    useHousingStore.setState({
      savedSimulations: [{
        id: "s1", name: "X", savedAt: new Date().toISOString(), schemaVersion: 2,
        input: DEFAULT_INPUT,
      }],
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SavedList />);
    const del = screen.getByLabelText("削除");
    act(() => { fireEvent.click(del); });
    expect(useHousingStore.getState().savedSimulations).toHaveLength(0);
    confirmSpy.mockRestore();
  });

  it("削除ボタン (confirm キャンセル) は何もしない", () => {
    useHousingStore.setState({
      savedSimulations: [{
        id: "s1", name: "X", savedAt: new Date().toISOString(), schemaVersion: 2,
        input: DEFAULT_INPUT,
      }],
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<SavedList />);
    const del = screen.getByLabelText("削除");
    act(() => { fireEvent.click(del); });
    expect(useHousingStore.getState().savedSimulations).toHaveLength(1);
    confirmSpy.mockRestore();
  });
});
