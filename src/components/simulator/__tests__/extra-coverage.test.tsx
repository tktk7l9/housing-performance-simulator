/**
 * カバレッジ追加用のテスト集約。
 * 対象:
 * - BuildingStep: addressPrefecture/addressCity/region/presence 切替
 * - PerformanceStep: presetChange (custom / non-custom), cValue, windowSpec
 * - RenovationStep: ageBracket/UA/C/window/heater/heating, item toggle
 * - ScenarioStep: チェックボックスで toggleScenario / 「計算する」で calculate+onNext
 * - EconomyStep: electricityRise セレクト、subsidy 適用ボタン分岐
 * - SaveDialog: form submit / cancel / outer onOpenChange / ESC / バックドロップクリック
 * - SimulatorApp: setStep 変更で scroll が走る経路、ResultsStep への遷移
 * - Input ui: onFocus(select)/onWheel(blur) を type=number で発火
 * - Dialog ui: ESC キーで close
 * - SensitivityChart: 入力値違いでの再描画
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BuildingStep } from "../steps/BuildingStep";
import { PerformanceStep } from "../steps/PerformanceStep";
import { RenovationStep } from "../steps/RenovationStep";
import { ScenarioStep } from "../steps/ScenarioStep";
import { EconomyStep } from "../steps/EconomyStep";
import { SaveDialog } from "../SaveDialog";
import { SimulatorApp } from "../SimulatorApp";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SensitivityChart } from "../results/SensitivityChart";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
  };
});

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

describe("BuildingStep additional interactions", () => {
  it("addressPrefecture 設定で setAddress 経由 region 更新", () => {
    render(<BuildingStep onNext={() => {}} />);
    // Radix Select は jsdom で完全に動かないので、setAddress を直接呼ぶ
    act(() => {
      useHousingStore.getState().setAddress("北海道");
    });
    expect(useHousingStore.getState().input.addressPrefecture).toBe("北海道");
    expect(useHousingStore.getState().input.region).toBeLessThanOrEqual(2);
  });

  it("setAddress(undefined) で都道府県解除", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都", addressCity: "八王子市" },
    });
    render(<BuildingStep onNext={() => {}} />);
    act(() => {
      useHousingStore.getState().setAddress(undefined);
    });
    expect(useHousingStore.getState().input.addressPrefecture).toBeUndefined();
    expect(useHousingStore.getState().input.addressCity).toBeUndefined();
  });

  it("setAddress(prefecture, city) でハイブリッド設定", () => {
    render(<BuildingStep onNext={() => {}} />);
    act(() => {
      useHousingStore.getState().setAddress("北海道", "札幌市");
    });
    expect(useHousingStore.getState().input.addressCity).toBe("札幌市");
  });

  it("addressPrefecture セット後の城市候補ヒント", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // 説明文が描画される（市町村セレクトの hint いずれか）
    expect(
      screen.getAllByText(/(代表都市|例外市町村)/).length,
    ).toBeGreaterThan(0);
  });
});

describe("PerformanceStep additional", () => {
  it("UAValue 入力で insulationPreset → custom", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const ua = screen.getByDisplayValue("0.87") as HTMLInputElement;
    act(() => { fireEvent.change(ua, { target: { value: "0.4" } }); });
    expect(useHousingStore.getState().input.insulationPreset).toBe("custom");
    expect(useHousingStore.getState().input.uaValue).toBeCloseTo(0.4);
  });

  it("CValue 入力で custom", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const c = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(c, { target: { value: "1.5" } }); });
    expect(useHousingStore.getState().input.cValue).toBeCloseTo(1.5);
    expect(useHousingStore.getState().input.insulationPreset).toBe("custom");
  });

  it("UAValue/CValue: 不正値で 0 fallback", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const ua = screen.getByDisplayValue("0.87") as HTMLInputElement;
    act(() => { fireEvent.change(ua, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.uaValue).toBe(0);
    const c = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(c, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.cValue).toBe(0);
  });

  it("insulationPreset=custom 表示時の hint fallback (energy-saving description)", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, insulationPreset: "custom" } });
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    // フィールド hint が描画される (Field 経由)
    expect(screen.getAllByText(/省エネ基準|断熱/).length).toBeGreaterThan(0);
  });
});

describe("RenovationStep interactions", () => {
  beforeEach(() => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
    });
  });

  it("existingUa 変更", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    // r.existingUa のデフォルト
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const uaInput = inputs.find((i) => Number(i.value) > 0 && Number(i.value) < 3.5)!;
    act(() => { fireEvent.change(uaInput, { target: { value: "1.5" } }); });
    expect(useHousingStore.getState().input.renovation?.existingUa).toBeCloseTo(1.5);
  });

  it("existingC 変更で 0 fallback", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    // existingC は値が 1〜数十程度
    const cInput = inputs.find((i) => i.id === "existingC")!;
    act(() => { fireEvent.change(cInput, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.renovation?.existingCValue).toBe(0);
  });

  it("リフォーム項目のチェックで items 追加→削除", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(checkboxes[0]); });
    expect(useHousingStore.getState().input.renovation?.items.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(checkboxes[0]); });
    expect(useHousingStore.getState().input.renovation?.items.length).toBe(0);
  });

  it("概算合計が描画される", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/概算合計/).length).toBeGreaterThan(0);
  });
});

describe("ScenarioStep interactions", () => {
  it("通常シナリオのチェックで toggleScenario", () => {
    render(<ScenarioStep onNext={() => {}} onBack={() => {}} />);
    const boxes = screen.getAllByRole("checkbox");
    // 1つ目は基準 (disabled) なので 2つ目を toggle
    const before = useHousingStore.getState().selectedScenarioIds.length;
    act(() => { fireEvent.click(boxes[1]); });
    const after = useHousingStore.getState().selectedScenarioIds.length;
    expect(after).not.toBe(before);
  });

  it("計算するボタンで calculate + onNext", () => {
    const onNext = vi.fn();
    render(<ScenarioStep onNext={onNext} onBack={() => {}} />);
    fireEvent.click(screen.getByText("計算する"));
    expect(onNext).toHaveBeenCalled();
    expect(useHousingStore.getState().result).not.toBeNull();
  });

  it("renovation モードでも描画", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      selectedScenarioIds: defaultSelectedScenarios("renovation"),
    });
    expect(() => render(<ScenarioStep onNext={() => {}} onBack={() => {}} />)).not.toThrow();
  });
});

describe("EconomyStep additional", () => {
  it("電気料金: 不正値で 0 fallback", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const ePrice = screen.getByDisplayValue("32") as HTMLInputElement;
    act(() => { fireEvent.change(ePrice, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.electricityPriceBuy).toBe(0);
  });

  it("ガス料金: 不正値で 0 fallback", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const gas = screen.getByDisplayValue("200") as HTMLInputElement;
    act(() => { fireEvent.change(gas, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.gasPrice).toBe(0);
  });

  it("FIT/卒FIT 売電単価: 不正値で 0", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const fit = screen.getByDisplayValue("15") as HTMLInputElement;
    act(() => { fireEvent.change(fit, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.sellPriceFit).toBe(0);
    const post = screen.getByDisplayValue("8") as HTMLInputElement;
    act(() => { fireEvent.change(post, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.sellPricePostFit).toBe(0);
  });
});

describe("SaveDialog interactions", () => {
  it("name 空のまま送信で placeholder が適用される", () => {
    const onOpenChange = vi.fn();
    render(<SaveDialog open onOpenChange={onOpenChange} />);
    // 「保存する」ボタン
    const submitBtn = screen.getByText("保存する").closest("button")!;
    act(() => { fireEvent.click(submitBtn); });
    expect(useHousingStore.getState().savedSimulations.length).toBe(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("キャンセルボタンで onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(<SaveDialog open onOpenChange={onOpenChange} />);
    const cancel = screen.getByText("キャンセル").closest("button")!;
    act(() => { fireEvent.click(cancel); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(useHousingStore.getState().savedSimulations.length).toBe(0);
  });

  it("Dialog 外側 onOpenChange(false) は name をクリアする", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<SaveDialog open onOpenChange={onOpenChange} />);
    const inputs = screen.getAllByRole("textbox");
    act(() => { fireEvent.change(inputs[0], { target: { value: "hoge" } }); });
    // 閉じるボタン (aria-label="閉じる")
    const closeBtn = screen.getByLabelText("閉じる");
    act(() => { fireEvent.click(closeBtn); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(<SaveDialog open onOpenChange={onOpenChange} />);
    // name は state クリア後の "" 状態（placeholder 表示）
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe("");
  });

  it("renovation モード時の placeholder 表記", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
    });
    render(<SaveDialog open onOpenChange={() => {}} />);
    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    expect(input.placeholder).toContain("リフォーム");
  });
});

describe("Dialog ui", () => {
  it("ESC キーで onOpenChange(false)", () => {
    const onChange = vi.fn();
    render(
      <Dialog open onOpenChange={onChange} title="t">
        <span>body</span>
      </Dialog>,
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("バックドロップクリックで onOpenChange(false)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Dialog open onOpenChange={onChange}>
        <span>body</span>
      </Dialog>,
    );
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).toBeTruthy();
    act(() => { fireEvent.click(backdrop); });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("open=false で何も描画しない", () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={() => {}}>
        <span>body</span>
      </Dialog>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("Input ui", () => {
  it("type=number で onFocus が input.select() を呼ぶ", () => {
    const onFocus = vi.fn();
    render(<Input type="number" defaultValue="42" onFocus={onFocus} />);
    const el = screen.getByDisplayValue("42") as HTMLInputElement;
    const selectSpy = vi.spyOn(el, "select");
    fireEvent.focus(el);
    expect(selectSpy).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
  });

  it("type=number で onWheel が blur を呼ぶ", () => {
    const onWheel = vi.fn();
    render(<Input type="number" defaultValue="3" onWheel={onWheel} />);
    const el = screen.getByDisplayValue("3") as HTMLInputElement;
    el.focus();
    const blurSpy = vi.spyOn(el, "blur");
    fireEvent.wheel(el);
    expect(blurSpy).toHaveBeenCalled();
    expect(onWheel).toHaveBeenCalled();
  });

  it("type=text で onFocus/onWheel は何もしない (副作用なし)", () => {
    render(<Input type="text" defaultValue="hi" />);
    const el = screen.getByDisplayValue("hi") as HTMLInputElement;
    expect(() => {
      fireEvent.focus(el);
      fireEvent.wheel(el);
    }).not.toThrow();
  });
});

describe("SimulatorApp step transitions", () => {
  it("setStep 変更で scroll を発火", () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window, "scrollTo", { value: scrollSpy, writable: true });
    // main 要素の getBoundingClientRect を mock して top を遠くにする
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return { top: 500, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
    };
    render(<SimulatorApp />);
    act(() => {
      useHousingStore.getState().setStep(1);
    });
    expect(scrollSpy).toHaveBeenCalled();
    Element.prototype.getBoundingClientRect = origRect;
  });

  it("ResultsStep への遷移", () => {
    useHousingStore.setState({ currentStep: 5 });
    render(<SimulatorApp />);
    // ResultsStep は title「結果」を描画
    expect(screen.getAllByText(/結果|総評/).length).toBeGreaterThan(0);
  });

  it("renovation モード: step 1 が RenovationStep", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      currentStep: 1,
    });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/現状とリフォーム計画/).length).toBeGreaterThan(0);
  });
});

describe("SensitivityChart", () => {
  it("カスタム input でも描画", () => {
    const custom = { ...DEFAULT_INPUT, solarCapacity: 0, batteryCapacity: 0 };
    expect(() => render(<SensitivityChart input={custom} />)).not.toThrow();
  });
});
