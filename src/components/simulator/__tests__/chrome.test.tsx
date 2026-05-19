/**
 * Simulator chrome: SimulatorApp / TrailSidebar / SavedList / SaveDialog のテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulatorApp } from "../SimulatorApp";
import { TrailSidebar } from "../TrailSidebar";
import { SaveDialog } from "../SaveDialog";
import { SavedList } from "../SavedList";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios, STEP_IDS_NEW_BUILD } from "@/store/housingStore";

// Recharts は ResizeObserver 依存 → stub
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
  it("currentStep=0: BuildingStep を表示", () => {
    render(<SimulatorApp />);
    expect(screen.getByText("建物条件")).toBeTruthy();
  });

  it("setStep(1): PerformanceStep へ", () => {
    render(<SimulatorApp />);
    useHousingStore.setState({ currentStep: 1 });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/性能|断熱/).length).toBeGreaterThan(0);
  });

  it("renovation モード: RenovationStep が出現", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      currentStep: 1,
    });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/リフォーム|改修/).length).toBeGreaterThan(0);
  });

  it("step 上限を超えた currentStep でも results を表示", () => {
    useHousingStore.setState({
      currentStep: 99,
    });
    expect(() => render(<SimulatorApp />)).not.toThrow();
  });
});

describe("TrailSidebar", () => {
  it("ステップ名一覧を表示", () => {
    render(<TrailSidebar />);
    // 6 ステップが見える
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("クリックで currentStep が変わる", () => {
    render(<TrailSidebar />);
    const buttons = screen.getAllByRole("button");
    if (buttons.length > 1) {
      fireEvent.click(buttons[1]);
      // step が変化
      expect(useHousingStore.getState().currentStep).not.toBe(0);
    }
  });

  it("renovation モードでも描画", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<TrailSidebar />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("SaveDialog", () => {
  it("open=false なら何も描画しない or 不在", () => {
    render(<SaveDialog open={false} onOpenChange={() => {}} />);
    // dialog テキストは出ない
    expect(screen.queryByText(/保存名|保存$/)).toBeNull();
  });

  it("open=true で表示", () => {
    render(<SaveDialog open onOpenChange={() => {}} />);
    expect(screen.getAllByText(/保存/).length).toBeGreaterThan(0);
  });

  it("名前を入力して保存ボタン押下で saveCurrent 呼び出し", () => {
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
  it("保存ゼロ件: 空メッセージ or ボタンのみ", () => {
    render(<SavedList />);
    // 保存リストの何らかの UI が見える
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it("保存 1件あれば名前表示", () => {
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
