/**
 * ステップ内のイベントハンドラを発火させて Funcs カバレッジを上げる
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BuildingStep } from "../steps/BuildingStep";
import { EquipmentStep } from "../steps/EquipmentStep";
import { EconomyStep } from "../steps/EconomyStep";
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

describe("BuildingStep interactions", () => {
  it("家族人数の入力で household 更新", () => {
    render(<BuildingStep onNext={() => {}} />);
    const household = screen.getByDisplayValue("4") as HTMLInputElement;
    act(() => { fireEvent.change(household, { target: { value: "6" } }); });
    expect(useHousingStore.getState().input.household).toBe(6);
  });

  it("家族人数: 不正値で fallback 1", () => {
    render(<BuildingStep onNext={() => {}} />);
    const household = screen.getByDisplayValue("4") as HTMLInputElement;
    act(() => { fireEvent.change(household, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.household).toBe(1);
  });

  it("延床面積入力: 不正値で fallback 0", () => {
    render(<BuildingStep onNext={() => {}} />);
    const floor = screen.getByDisplayValue("120") as HTMLInputElement;
    act(() => { fireEvent.change(floor, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.floorArea).toBe(0);
  });

  it("想定居住年数: 不正値で fallback 30", () => {
    render(<BuildingStep onNext={() => {}} />);
    const ly = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(ly, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.livingYears).toBe(30);
  });

  it("renovation モード: 「残り想定居住年数」ラベル", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<BuildingStep onNext={() => {}} />);
    expect(screen.getByText(/残り想定居住年数/)).toBeTruthy();
  });

  it("ModeToggle: 新築→リフォームへ切替", () => {
    render(<BuildingStep onNext={() => {}} />);
    const renoBtn = screen.getByText("既築リフォーム").closest("button")!;
    act(() => { fireEvent.click(renoBtn); });
    expect(useHousingStore.getState().input.mode).toBe("renovation");
  });

  it("ModeToggle: リフォーム→新築", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<BuildingStep onNext={() => {}} />);
    const newBtn = screen.getByText("新築").closest("button")!;
    act(() => { fireEvent.click(newBtn); });
    expect(useHousingStore.getState().input.mode).toBe("new-build");
  });

  it("addressPrefecture 設定後の表示", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // hint に 住所自動判定 が出る
    expect(screen.getAllByText(/住所から自動判定/).length).toBeGreaterThan(0);
  });
});

describe("EquipmentStep interactions", () => {
  it("太陽光容量で solarCapacity 更新", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const solar = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(solar, { target: { value: "10" } }); });
    expect(useHousingStore.getState().input.solarCapacity).toBe(10);
  });

  it("太陽光容量: 不正値で fallback 0", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const solar = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(solar, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.solarCapacity).toBe(0);
  });

  it("蓄電池容量で batteryCapacity 更新", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const battery = screen.getByDisplayValue("0") as HTMLInputElement;
    act(() => { fireEvent.change(battery, { target: { value: "7" } }); });
    expect(useHousingStore.getState().input.batteryCapacity).toBe(7);
  });

  it("太陽光傾斜角の数値変更", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const tilt = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(tilt, { target: { value: "45" } }); });
    expect(useHousingStore.getState().input.solarTilt).toBe(45);
  });

  it("太陽光傾斜角: 不正値で fallback 0", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const tilt = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(tilt, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.solarTilt).toBe(0);
  });

  it("HEMS トグルでオン", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const toggle = screen.getByRole("switch");
    act(() => { fireEvent.click(toggle); });
    expect(useHousingStore.getState().input.hems).toBe(true);
  });

  it("蓄電池: 不正値で fallback 0", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const battery = screen.getByDisplayValue("0") as HTMLInputElement;
    act(() => { fireEvent.change(battery, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.batteryCapacity).toBe(0);
  });
});

describe("EconomyStep interactions", () => {
  it("電気料金変更", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const ePrice = screen.getByDisplayValue("32") as HTMLInputElement;
    act(() => { fireEvent.change(ePrice, { target: { value: "45" } }); });
    expect(useHousingStore.getState().input.electricityPriceBuy).toBe(45);
  });

  it("ガス料金変更", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const gas = screen.getByDisplayValue("200") as HTMLInputElement;
    act(() => { fireEvent.change(gas, { target: { value: "180" } }); });
    expect(useHousingStore.getState().input.gasPrice).toBe(180);
  });

  it("FIT 売電単価", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const fit = screen.getByDisplayValue("15") as HTMLInputElement;
    act(() => { fireEvent.change(fit, { target: { value: "20" } }); });
    expect(useHousingStore.getState().input.sellPriceFit).toBe(20);
  });

  it("卒FIT 売電単価", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const post = screen.getByDisplayValue("8") as HTMLInputElement;
    act(() => { fireEvent.change(post, { target: { value: "6" } }); });
    expect(useHousingStore.getState().input.sellPricePostFit).toBe(6);
  });

  it("補助金チェックボックスクリックで appliedSubsidyIds 切替", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, solarCapacity: 5, insulationPreset: "heat20-g2" },
    });
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes.length > 0) {
      act(() => { fireEvent.click(checkboxes[0]); });
      expect(useHousingStore.getState().input.appliedSubsidyIds.length).toBeGreaterThan(0);
      act(() => { fireEvent.click(checkboxes[0]); });
      expect(useHousingStore.getState().input.appliedSubsidyIds.length).toBe(0);
    }
  });

  it("適用する補助金 セクション描画", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/適用する補助金/)).toBeTruthy();
  });
});
