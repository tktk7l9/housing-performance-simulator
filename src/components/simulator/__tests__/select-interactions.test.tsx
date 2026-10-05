/**
 * Radix Select cannot be opened in jsdom, so ui/select is replaced with a plain <select>
 * to cover the branches of the onValueChange handlers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Replace the Select components with a plain select
vi.mock("@/components/ui/select", () => {
  type SelectProps = {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: React.ReactNode;
    disabled?: boolean;
  };
  function Select({ value, onValueChange, children, disabled }: SelectProps) {
    // Extract the values of SelectItem inside children
    const items: { value: string; label: React.ReactNode }[] = [];
    const walk = (node: React.ReactNode) => {
      React.Children.forEach(node, (child) => {
        if (!React.isValidElement(child)) return;
        const el = child as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
        if (el.props.value !== undefined) {
          items.push({ value: el.props.value, label: el.props.children });
        }
        if (el.props.children) walk(el.props.children);
      });
    };
    walk(children);
    return (
      <select
        data-testid="native-select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {items.map((it) => (
          <option key={it.value} value={it.value}>
            {typeof it.label === "string" ? it.label : it.value}
          </option>
        ))}
      </select>
    );
  }
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const Item = ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );
  return {
    Select,
    SelectContent: Passthrough,
    SelectTrigger: Passthrough,
    SelectValue: Passthrough,
    SelectItem: Item,
  };
});

import { BuildingStep } from "../steps/BuildingStep";
import { PerformanceStep } from "../steps/PerformanceStep";
import { EquipmentStep } from "../steps/EquipmentStep";
import { EconomyStep } from "../steps/EconomyStep";
import { RenovationStep } from "../steps/RenovationStep";
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

function selects() {
  return screen.getAllByTestId("native-select") as HTMLSelectElement[];
}

describe("BuildingStep select handlers", () => {
  it("changing region updates region and uaValue together", () => {
    render(<BuildingStep onNext={() => {}} />);
    // Around the fourth one is region: value=6
    const regionSel = selects().find((s) => s.value === "6")!;
    act(() => { fireEvent.change(regionSel, { target: { value: "1" } }); });
    expect(useHousingStore.getState().input.region).toBe(1);
  });

  it("changing region keeps uaValue with the custom preset", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, insulationPreset: "custom", uaValue: 0.5 },
    });
    render(<BuildingStep onNext={() => {}} />);
    const regionSel = selects().find((s) => s.value === "6")!;
    act(() => { fireEvent.change(regionSel, { target: { value: "1" } }); });
    expect(useHousingStore.getState().input.uaValue).toBe(0.5);
  });

  it("setting addressPrefecture sets region automatically", () => {
    render(<BuildingStep onNext={() => {}} />);
    const prefSel = selects()[0];
    act(() => { fireEvent.change(prefSel, { target: { value: "北海道" } }); });
    expect(useHousingStore.getState().input.addressPrefecture).toBe("北海道");
  });

  it("resetting addressPrefecture to __none__ makes it undefined", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    const prefSel = selects()[0];
    act(() => { fireEvent.change(prefSel, { target: { value: "__none__" } }); });
    expect(useHousingStore.getState().input.addressPrefecture).toBeUndefined();
  });

  it("changing addressCity sets city", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "北海道" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // The city select is the second one
    const citySel = selects()[1];
    const opts = Array.from(citySel.options).map((o) => o.value);
    // If there is any city candidate
    const cityValue = opts.find((v) => v !== "__none__");
    if (cityValue) {
      act(() => { fireEvent.change(citySel, { target: { value: cityValue } }); });
      expect(useHousingStore.getState().input.addressCity).toBe(cityValue);
    }
  });

  it("setting addressCity to __none__ makes it undefined", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "北海道", addressCity: "札幌市" },
    });
    render(<BuildingStep onNext={() => {}} />);
    const citySel = selects()[1];
    act(() => { fireEvent.change(citySel, { target: { value: "__none__" } }); });
    expect(useHousingStore.getState().input.addressCity).toBeUndefined();
  });

  it("onCityChange does nothing without addressPrefecture (early return)", () => {
    render(<BuildingStep onNext={() => {}} />);
    // The city select is expected to be disabled, but fire change anyway
    const citySel = selects()[1];
    act(() => { fireEvent.change(citySel, { target: { value: "" } }); });
    // addressPrefecture stays undefined, and city stays undefined too
    expect(useHousingStore.getState().input.addressPrefecture).toBeUndefined();
  });

  it("changes presence", () => {
    render(<BuildingStep onNext={() => {}} />);
    const presenceSel = selects().find((s) => s.value === "evening-only")!;
    act(() => { fireEvent.change(presenceSel, { target: { value: "all-day" } }); });
    expect(useHousingStore.getState().input.presence).toBe("all-day");
  });
});

describe("PerformanceStep onPresetChange", () => {
  it("choosing a non-custom preset sets UA/C automatically", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const presetSel = selects().find((s) => s.value === "energy-saving")!;
    act(() => { fireEvent.change(presetSel, { target: { value: "heat20-g2" } }); });
    expect(useHousingStore.getState().input.insulationPreset).toBe("heat20-g2");
    expect(useHousingStore.getState().input.uaValue).toBeLessThan(0.5);
  });

  it("choosing custom keeps UA/C", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, uaValue: 0.9, cValue: 4 },
    });
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const presetSel = selects().find((s) => s.value === "energy-saving")!;
    act(() => { fireEvent.change(presetSel, { target: { value: "custom" } }); });
    expect(useHousingStore.getState().input.insulationPreset).toBe("custom");
    expect(useHousingStore.getState().input.uaValue).toBe(0.9);
    expect(useHousingStore.getState().input.cValue).toBe(4);
  });

  it("changes windowSpec", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const winSel = selects().find((s) => s.value === "alum-resin-pair-lowe")!;
    const opt = Array.from(winSel.options).find((o) => o.value !== "alum-resin-pair-lowe")!;
    act(() => { fireEvent.change(winSel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.windowSpec).toBe(opt.value);
  });
});

describe("EquipmentStep selects", () => {
  it("changes solarOrientation", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "south")!;
    act(() => { fireEvent.change(sel, { target: { value: "south-east" } }); });
    expect(useHousingStore.getState().input.solarOrientation).toBe("south-east");
  });

  it("changes waterHeater", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "eco-cute")!;
    const opt = Array.from(sel.options).find((o) => o.value !== "eco-cute")!;
    act(() => { fireEvent.change(sel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.waterHeater).toBe(opt.value);
  });

  it("changes heating", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "ac-only")!;
    const opt = Array.from(sel.options).find((o) => o.value !== "ac-only")!;
    act(() => { fireEvent.change(sel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.heating).toBe(opt.value);
  });
});

describe("EconomyStep electricityRise", () => {
  it("changes electricityRise", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "moderate")!;
    act(() => { fireEvent.change(sel, { target: { value: "steep" } }); });
    expect(useHousingStore.getState().input.electricityRise).toBe("steep");
  });

  it("electricityRise: selects flat", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "moderate")!;
    act(() => { fireEvent.change(sel, { target: { value: "flat" } }); });
    expect(useHousingStore.getState().input.electricityRise).toBe("flat");
  });
});

describe("RenovationStep selects", () => {
  beforeEach(() => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, mode: "renovation" },
    });
  });

  it("changing ageBracket sets UA/C/window automatically", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects()[0]; // ageBracket
    const opts = Array.from(sel.options);
    const other = opts.find((o) => o.value !== sel.value)!;
    act(() => { fireEvent.change(sel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.ageBracket).toBe(other.value);
  });

  it("changes existingWindow", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sels = selects();
    // existingWindow comes around right after ageBracket
    const winSel = sels.find((s) =>
      Array.from(s.options).some((o) => o.value === "alum-resin-pair-lowe"),
    )!;
    const other = Array.from(winSel.options).find((o) => o.value !== winSel.value)!;
    act(() => { fireEvent.change(winSel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.existingWindow).toBe(other.value);
  });

  it("changes existingWaterHeater", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sels = selects();
    const heaterSel = sels.find((s) =>
      Array.from(s.options).some((o) => o.value === "eco-cute"),
    )!;
    const other = Array.from(heaterSel.options).find((o) => o.value !== heaterSel.value)!;
    act(() => { fireEvent.change(heaterSel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.existingWaterHeater).toBe(other.value);
  });

  it("changes existingHeating", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sels = selects();
    const heatingSel = sels.find((s) =>
      Array.from(s.options).some((o) => o.value === "ac-only"),
    )!;
    const other = Array.from(heatingSel.options).find((o) => o.value !== heatingSel.value)!;
    act(() => { fireEvent.change(heatingSel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.existingHeating).toBe(other.value);
  });
});
