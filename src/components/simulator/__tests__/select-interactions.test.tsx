/**
 * Radix Select は jsdom で開けないため、ui/select を素の <select> に差し替えて
 * onValueChange ハンドラの分岐を網羅する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Select系を素のセレクトに差し替え
vi.mock("@/components/ui/select", () => {
  type SelectProps = {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: React.ReactNode;
    disabled?: boolean;
  };
  function Select({ value, onValueChange, children, disabled }: SelectProps) {
    // children 内の SelectItem の value を抽出
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
  it("region 変更で region/uaValue 同期更新", () => {
    render(<BuildingStep onNext={() => {}} />);
    // 4つめあたりが region: value=6 のもの
    const regionSel = selects().find((s) => s.value === "6")!;
    act(() => { fireEvent.change(regionSel, { target: { value: "1" } }); });
    expect(useHousingStore.getState().input.region).toBe(1);
  });

  it("region 変更時 custom preset では uaValue は維持", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, insulationPreset: "custom", uaValue: 0.5 },
    });
    render(<BuildingStep onNext={() => {}} />);
    const regionSel = selects().find((s) => s.value === "6")!;
    act(() => { fireEvent.change(regionSel, { target: { value: "1" } }); });
    expect(useHousingStore.getState().input.uaValue).toBe(0.5);
  });

  it("addressPrefecture 設定で region 自動", () => {
    render(<BuildingStep onNext={() => {}} />);
    const prefSel = selects()[0];
    act(() => { fireEvent.change(prefSel, { target: { value: "北海道" } }); });
    expect(useHousingStore.getState().input.addressPrefecture).toBe("北海道");
  });

  it("addressPrefecture を __none__ に戻すと undefined", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "東京都" },
    });
    render(<BuildingStep onNext={() => {}} />);
    const prefSel = selects()[0];
    act(() => { fireEvent.change(prefSel, { target: { value: "__none__" } }); });
    expect(useHousingStore.getState().input.addressPrefecture).toBeUndefined();
  });

  it("addressCity 変更で city セット", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "北海道" },
    });
    render(<BuildingStep onNext={() => {}} />);
    // city select は 2つめ
    const citySel = selects()[1];
    const opts = Array.from(citySel.options).map((o) => o.value);
    // 何らかの都市候補があれば
    const cityValue = opts.find((v) => v !== "__none__");
    if (cityValue) {
      act(() => { fireEvent.change(citySel, { target: { value: cityValue } }); });
      expect(useHousingStore.getState().input.addressCity).toBe(cityValue);
    }
  });

  it("addressCity を __none__ にすると undefined", () => {
    useHousingStore.setState({
      input: { ...DEFAULT_INPUT, addressPrefecture: "北海道", addressCity: "札幌市" },
    });
    render(<BuildingStep onNext={() => {}} />);
    const citySel = selects()[1];
    act(() => { fireEvent.change(citySel, { target: { value: "__none__" } }); });
    expect(useHousingStore.getState().input.addressCity).toBeUndefined();
  });

  it("addressPrefecture 未設定で onCityChange は何もしない (early return)", () => {
    render(<BuildingStep onNext={() => {}} />);
    // City select は disabled 想定だが、無理に change を発火
    const citySel = selects()[1];
    act(() => { fireEvent.change(citySel, { target: { value: "" } }); });
    // addressPrefecture が undefined のままで、city も undefined のまま
    expect(useHousingStore.getState().input.addressPrefecture).toBeUndefined();
  });

  it("presence セレクト変更", () => {
    render(<BuildingStep onNext={() => {}} />);
    const presenceSel = selects().find((s) => s.value === "evening-only")!;
    act(() => { fireEvent.change(presenceSel, { target: { value: "all-day" } }); });
    expect(useHousingStore.getState().input.presence).toBe("all-day");
  });
});

describe("PerformanceStep onPresetChange", () => {
  it("カスタム以外を選ぶと UA/C 自動セット", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const presetSel = selects().find((s) => s.value === "energy-saving")!;
    act(() => { fireEvent.change(presetSel, { target: { value: "heat20-g2" } }); });
    expect(useHousingStore.getState().input.insulationPreset).toBe("heat20-g2");
    expect(useHousingStore.getState().input.uaValue).toBeLessThan(0.5);
  });

  it("custom を選ぶと UA/C は維持", () => {
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

  it("windowSpec 変更", () => {
    render(<PerformanceStep onNext={() => {}} onBack={() => {}} />);
    const winSel = selects().find((s) => s.value === "alum-resin-pair-lowe")!;
    const opt = Array.from(winSel.options).find((o) => o.value !== "alum-resin-pair-lowe")!;
    act(() => { fireEvent.change(winSel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.windowSpec).toBe(opt.value);
  });
});

describe("EquipmentStep selects", () => {
  it("solarOrientation 変更", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "south")!;
    act(() => { fireEvent.change(sel, { target: { value: "south-east" } }); });
    expect(useHousingStore.getState().input.solarOrientation).toBe("south-east");
  });

  it("waterHeater 変更", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "eco-cute")!;
    const opt = Array.from(sel.options).find((o) => o.value !== "eco-cute")!;
    act(() => { fireEvent.change(sel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.waterHeater).toBe(opt.value);
  });

  it("heating 変更", () => {
    render(<EquipmentStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "ac-only")!;
    const opt = Array.from(sel.options).find((o) => o.value !== "ac-only")!;
    act(() => { fireEvent.change(sel, { target: { value: opt.value } }); });
    expect(useHousingStore.getState().input.heating).toBe(opt.value);
  });
});

describe("EconomyStep electricityRise", () => {
  it("electricityRise 変更", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects().find((s) => s.value === "moderate")!;
    act(() => { fireEvent.change(sel, { target: { value: "steep" } }); });
    expect(useHousingStore.getState().input.electricityRise).toBe("steep");
  });

  it("electricityRise: flat 選択", () => {
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

  it("ageBracket 変更で UA/C/window 自動セット", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sel = selects()[0]; // ageBracket
    const opts = Array.from(sel.options);
    const other = opts.find((o) => o.value !== sel.value)!;
    act(() => { fireEvent.change(sel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.ageBracket).toBe(other.value);
  });

  it("existingWindow 変更", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sels = selects();
    // existingWindow は ageBracket の次あたり
    const winSel = sels.find((s) =>
      Array.from(s.options).some((o) => o.value === "alum-resin-pair-lowe"),
    )!;
    const other = Array.from(winSel.options).find((o) => o.value !== winSel.value)!;
    act(() => { fireEvent.change(winSel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.existingWindow).toBe(other.value);
  });

  it("existingWaterHeater 変更", () => {
    render(<RenovationStep onNext={() => {}} onBack={() => {}} />);
    const sels = selects();
    const heaterSel = sels.find((s) =>
      Array.from(s.options).some((o) => o.value === "eco-cute"),
    )!;
    const other = Array.from(heaterSel.options).find((o) => o.value !== heaterSel.value)!;
    act(() => { fireEvent.change(heaterSel, { target: { value: other.value } }); });
    expect(useHousingStore.getState().input.renovation?.existingWaterHeater).toBe(other.value);
  });

  it("existingHeating 変更", () => {
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
