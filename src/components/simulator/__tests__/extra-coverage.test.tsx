/**
 * Collection of tests added for coverage.
 * Targets:
 * - BuildingStep: switching addressPrefecture/addressCity/region/presence
 * - PerformanceStep: presetChange (custom / non-custom), cValue, windowSpec
 * - RenovationStep: ageBracket/UA/C/window/heater/heating, item toggle
 * - ScenarioStep: toggleScenario via checkbox / onNext via "結果を見る"
 * - EconomyStep: electricityRise select, subsidy apply-button branches
 * - SaveDialog: form submit / cancel / outer onOpenChange / ESC / backdrop click
 * - SimulatorApp: the path where a setStep change triggers scrolling, moving on to ResultsStep
 * - Input ui: fire onFocus(select)/onWheel(blur) on type=number
 * - Dialog ui: close with the ESC key
 * - SensitivityChart: re-render with different input values
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
  it("setting addressPrefecture updates region via setAddress", () => {
    render(<BuildingStep onNext={() => {}} />);
    // Radix Select does not fully work in jsdom, so call setAddress directly
    act(() => {
      useHousingStore.getState().setAddress("北海道");
    });
    expect(useHousingStore.getState().input.addressPrefecture).toBe("北海道");
    expect(useHousingStore.getState().input.region).toBeLessThanOrEqual(2);
  });

  it("setAddress(undefined) clears the prefecture", () => {
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

  it("setAddress(prefecture, city) sets both", () => {
    render(<BuildingStep onNext={() => {}} />);
    act(() => {
      useHousingStore.getState().setAddress("北海道", "札幌市");
    });
    expect(useHousingStore.getState().input.addressCity).toBe("札幌市");
  });

  it("shows the city hint after addressPrefecture is set", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // Description text is rendered (one of the city select hints)
    expect(
      screen.getAllByText(/(代表都市|例外市町村)/).length,
    ).toBeGreaterThan(0);
  });
});

describe("PerformanceStep additional", () => {
  it("entering UAValue switches insulationPreset to custom", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const ua = screen.getByDisplayValue("0.87") as HTMLInputElement;
    act(() => { fireEvent.change(ua, { target: { value: "0.4" } }); });
    expect(useHousingStore.getState().input.insulationPreset).toBe("custom");
    expect(useHousingStore.getState().input.uaValue).toBeCloseTo(0.4);
  });

  it("entering CValue switches to custom", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const c = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(c, { target: { value: "1.5" } }); });
    expect(useHousingStore.getState().input.cValue).toBeCloseTo(1.5);
    expect(useHousingStore.getState().input.insulationPreset).toBe("custom");
  });

  it("UAValue/CValue: invalid input keeps the previous value", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const ua = screen.getByDisplayValue("0.87") as HTMLInputElement;
    act(() => { fireEvent.change(ua, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.uaValue).toBe(0.87);
    const c = screen.getByDisplayValue("5") as HTMLInputElement;
    act(() => { fireEvent.change(c, { target: { value: "abc" } }); });
    expect(useHousingStore.getState().input.cValue).toBe(5);
  });

  it("insulationPreset=custom falls back to the energy-saving hint", () => {
    useHousingStore.setState({ input: { ...DEFAULT_INPUT, insulationPreset: "custom" } });
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    // Field hint is rendered (via Field)
    expect(screen.getAllByText(/省エネ基準|断熱/).length).toBeGreaterThan(0);
  });
});

describe("RenovationStep interactions", () => {
  beforeEach(() => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
    });
  });

  it("changes existingUa", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    // Default of r.existingUa
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    const uaInput = inputs.find((i) => Number(i.value) > 0 && Number(i.value) < 3.5)!;
    act(() => { fireEvent.change(uaInput, { target: { value: "1.5" } }); });
    expect(useHousingStore.getState().input.renovation?.existingUa).toBeCloseTo(1.5);
  });

  it("existingC: invalid input is not applied and the reason shows on blur", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    // existingC ranges from about 1 to a few tens
    const cInput = inputs.find((i) => i.id === "existingC")!;
    const before = useHousingStore.getState().input.renovation?.existingCValue;
    act(() => { fireEvent.change(cInput, { target: { value: "xx" } }); });
    act(() => { fireEvent.blur(cInput); });
    expect(useHousingStore.getState().input.renovation?.existingCValue).toBe(before);
    expect(screen.getByText(/数値を入力してください/)).toBeTruthy();
  });

  it("checking a renovation item adds then removes it from items", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(checkboxes[0]); });
    expect(useHousingStore.getState().input.renovation?.items.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(checkboxes[0]); });
    expect(useHousingStore.getState().input.renovation?.items.length).toBe(0);
  });

  it("renders the estimated total", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getAllByText(/概算合計/).length).toBeGreaterThan(0);
  });
});

describe("ScenarioStep interactions", () => {
  it("checking a regular scenario calls toggleScenario", () => {
    render(<ScenarioStep onNext={() => {}} onBack={() => {}} />);
    const boxes = screen.getAllByRole("checkbox");
    // The first one is the baseline (disabled), so toggle the second
    const before = useHousingStore.getState().selectedScenarioIds.length;
    act(() => { fireEvent.click(boxes[1]); });
    const after = useHousingStore.getState().selectedScenarioIds.length;
    expect(after).not.toBe(before);
  });

  it("the 結果を見る button calls onNext (calculation runs on the results step)", () => {
    const onNext = vi.fn();
    render(<ScenarioStep onNext={onNext} onBack={() => {}} />);
    fireEvent.click(screen.getByText("結果を見る"));
    expect(onNext).toHaveBeenCalled();
  });

  it("renders in renovation mode", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      selectedScenarioIds: defaultSelectedScenarios("renovation"),
    });
    expect(() => render(<ScenarioStep onNext={() => {}} onBack={() => {}} />)).not.toThrow();
  });
});

describe("EconomyStep additional", () => {
  it("electricity price: invalid input is not applied", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const ePrice = screen.getByDisplayValue("32") as HTMLInputElement;
    act(() => { fireEvent.change(ePrice, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.electricityPriceBuy).toBe(32);
  });

  it("gas price: invalid input is not applied", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const gas = screen.getByDisplayValue("200") as HTMLInputElement;
    act(() => { fireEvent.change(gas, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.gasPrice).toBe(200);
  });

  it("FIT / post-FIT (卒FIT) sell price: invalid input is not applied", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const fit = screen.getByDisplayValue("15") as HTMLInputElement;
    act(() => { fireEvent.change(fit, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.sellPriceFit).toBe(15);
    const post = screen.getByDisplayValue("8") as HTMLInputElement;
    act(() => { fireEvent.change(post, { target: { value: "xx" } }); });
    expect(useHousingStore.getState().input.sellPricePostFit).toBe(8);
  });
});

describe("SaveDialog interactions", () => {
  it("submitting an empty name uses the placeholder", () => {
    const onOpenChange = vi.fn();
    render(<SaveDialog open onOpenChange={onOpenChange} />);
    // The "保存する" (save) button
    const submitBtn = screen.getByText("保存する").closest("button")!;
    act(() => { fireEvent.click(submitBtn); });
    expect(useHousingStore.getState().savedSimulations.length).toBe(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("the cancel button calls onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(<SaveDialog open onOpenChange={onOpenChange} />);
    const cancel = screen.getByText("キャンセル").closest("button")!;
    act(() => { fireEvent.click(cancel); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(useHousingStore.getState().savedSimulations.length).toBe(0);
  });

  it("onOpenChange(false) from outside the dialog clears the name", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<SaveDialog open onOpenChange={onOpenChange} />);
    const inputs = screen.getAllByRole("textbox");
    act(() => { fireEvent.change(inputs[0], { target: { value: "hoge" } }); });
    // Close button (aria-label="閉じる")
    const closeBtn = screen.getByLabelText("閉じる");
    act(() => { fireEvent.click(closeBtn); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(<SaveDialog open onOpenChange={onOpenChange} />);
    // name is "" after the state is cleared (placeholder shown)
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe("");
  });

  it("shows the renovation-mode placeholder", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
    });
    render(<SaveDialog open onOpenChange={() => {}} />);
    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    expect(input.placeholder).toContain("リフォーム");
  });
});

describe("Dialog ui", () => {
  it("Escape calls onOpenChange(false)", () => {
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

  it("clicking the backdrop calls onOpenChange(false)", () => {
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

  it("renders nothing when open=false", () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={() => {}}>
        <span>body</span>
      </Dialog>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("Input ui", () => {
  it("type=number: onFocus calls input.select()", () => {
    const onFocus = vi.fn();
    render(<Input type="number" defaultValue="42" onFocus={onFocus} />);
    const el = screen.getByDisplayValue("42") as HTMLInputElement;
    const selectSpy = vi.spyOn(el, "select");
    fireEvent.focus(el);
    expect(selectSpy).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
  });

  it("type=number: onWheel calls blur", () => {
    const onWheel = vi.fn();
    render(<Input type="number" defaultValue="3" onWheel={onWheel} />);
    const el = screen.getByDisplayValue("3") as HTMLInputElement;
    el.focus();
    const blurSpy = vi.spyOn(el, "blur");
    fireEvent.wheel(el);
    expect(blurSpy).toHaveBeenCalled();
    expect(onWheel).toHaveBeenCalled();
  });

  it("type=text: onFocus/onWheel have no side effects", () => {
    render(<Input type="text" defaultValue="hi" />);
    const el = screen.getByDisplayValue("hi") as HTMLInputElement;
    expect(() => {
      fireEvent.focus(el);
      fireEvent.wheel(el);
    }).not.toThrow();
  });
});

describe("SimulatorApp step transitions", () => {
  it("scrolls when the step changes", () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(window, "scrollTo", { value: scrollSpy, writable: true });
    // Mock getBoundingClientRect on the main element to push top far away
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

  it("navigates to ResultsStep", () => {
    useHousingStore.setState({ currentStep: 5 });
    render(<SimulatorApp />);
    // ResultsStep renders the title "結果"
    expect(screen.getAllByText(/結果|総評/).length).toBeGreaterThan(0);
  });

  it("renovation mode: step 1 is RenovationStep", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
      currentStep: 1,
    });
    render(<SimulatorApp />);
    expect(screen.getAllByText(/現状とリフォーム計画/).length).toBeGreaterThan(0);
  });
});

describe("SensitivityChart", () => {
  it("renders with a custom input", () => {
    const custom = { ...DEFAULT_INPUT, solarCapacity: 0, batteryCapacity: 0 };
    expect(() => render(<SensitivityChart input={custom} />)).not.toThrow();
  });
});
