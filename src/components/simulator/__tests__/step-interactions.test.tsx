/**
 * Fire event handlers inside the steps to raise Funcs coverage
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
  it("entering household size updates household", () => {
    render(<BuildingStep onNext={() => {}} />);
    const household = screen.getByDisplayValue("4") as HTMLInputElement;
    act(() => { fireEvent.change(household, { target: { value: "6" } }); });
    expect(useHousingStore.getState().input.household).toBe(6);
  });

  it("household size: invalid input keeps the previous value", () => {
    render(<BuildingStep onNext={() => {}} />);
    const household = screen.getByDisplayValue("4") as HTMLInputElement;
    act(() => { fireEvent.change(household, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.household).toBe(4);
  });

  it("floor area: invalid input keeps the previous value", () => {
    render(<BuildingStep onNext={() => {}} />);
    const floor = screen.getByDisplayValue("120") as HTMLInputElement;
    act(() => { fireEvent.change(floor, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.floorArea).toBe(120);
  });

  it("living years: invalid input falls back to 30", () => {
    render(<BuildingStep onNext={() => {}} />);
    const ly = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(ly, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.livingYears).toBe(30);
  });

  it("renovation mode uses the 「残り想定居住年数」 label", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<BuildingStep onNext={() => {}} />);
    expect(screen.getByText(/残り想定居住年数/)).toBeTruthy();
  });

  it("ModeToggle switches from new build to renovation", () => {
    render(<BuildingStep onNext={() => {}} />);
    const renoBtn = screen.getByText("既築リフォーム").closest("button")!;
    act(() => { fireEvent.click(renoBtn); });
    expect(useHousingStore.getState().input.mode).toBe("renovation");
  });

  it("ModeToggle switches from renovation to new build", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, mode: "renovation" } });
    render(<BuildingStep onNext={() => {}} />);
    const newBtn = screen.getByText("新築").closest("button")!;
    act(() => { fireEvent.click(newBtn); });
    expect(useHousingStore.getState().input.mode).toBe("new-build");
  });

  it("renders after addressPrefecture is set", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // The hint shows "住所自動判定" (auto-detect from address)
    expect(screen.getAllByText(/住所から自動判定/).length).toBeGreaterThan(0);
  });
});

describe("EquipmentStep interactions", () => {
  it("solar capacity input updates solarCapacity", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const solar = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(solar, { target: { value: "10" } }); });
    expect(useHousingStore.getState().input.solarCapacity).toBe(10);
  });

  it("solar capacity: invalid input keeps the previous value", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const solar = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(solar, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.solarCapacity).toBe(5);
  });

  it("battery capacity input updates batteryCapacity", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const battery = screen.getByDisplayValue("0") as HTMLInputElement;
    act(() => { fireEvent.change(battery, { target: { value: "7" } }); });
    expect(useHousingStore.getState().input.batteryCapacity).toBe(7);
  });

  it("changes the solar tilt angle", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const tilt = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(tilt, { target: { value: "45" } }); });
    expect(useHousingStore.getState().input.solarTilt).toBe(45);
  });

  it("solar tilt: invalid input keeps the previous value", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const tilt = screen.getByDisplayValue("30") as HTMLInputElement;
    act(() => { fireEvent.change(tilt, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.solarTilt).toBe(30);
  });

  it("the HEMS toggle turns it on", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const toggle = screen.getByRole("switch");
    act(() => { fireEvent.click(toggle); });
    expect(useHousingStore.getState().input.hems).toBe(true);
  });

  it("battery: invalid input falls back to 0", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const battery = screen.getByDisplayValue("0") as HTMLInputElement;
    act(() => { fireEvent.change(battery, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.batteryCapacity).toBe(0);
  });
});

describe("EconomyStep interactions", () => {
  it("changes the electricity price", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const ePrice = screen.getByDisplayValue("32") as HTMLInputElement;
    act(() => { fireEvent.change(ePrice, { target: { value: "45" } }); });
    expect(useHousingStore.getState().input.electricityPriceBuy).toBe(45);
  });

  it("changes the gas price", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const gas = screen.getByDisplayValue("200") as HTMLInputElement;
    act(() => { fireEvent.change(gas, { target: { value: "180" } }); });
    expect(useHousingStore.getState().input.gasPrice).toBe(180);
  });

  it("changes the FIT sell price", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const fit = screen.getByDisplayValue("15") as HTMLInputElement;
    act(() => { fireEvent.change(fit, { target: { value: "20" } }); });
    expect(useHousingStore.getState().input.sellPriceFit).toBe(20);
  });

  it("changes the post-FIT (卒FIT) sell price", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const post = screen.getByDisplayValue("8") as HTMLInputElement;
    act(() => { fireEvent.change(post, { target: { value: "6" } }); });
    expect(useHousingStore.getState().input.sellPricePostFit).toBe(6);
  });

  it("clicking a subsidy checkbox toggles appliedSubsidyIds", () => {
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

  it("renders the applicable-subsidies section", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/適用する補助金/)).toBeTruthy();
  });
});
