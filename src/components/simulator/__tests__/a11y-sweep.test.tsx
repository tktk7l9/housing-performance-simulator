/**
 * Accessibility sweep (axe-core, 2026-10): landmarks, heading outline, dialog keyboard
 * handling, grouped fields, and scrollable table focus.
 * SHIG 59 / 33 / 13 / 78 / 94.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "../Field";
import { SaveDialog } from "../SaveDialog";
import { SimulatorApp } from "../SimulatorApp";
import { ResultsStep } from "../steps/ResultsStep";
import { EconomyStep } from "../steps/EconomyStep";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { CumulativeCostChart } from "../results/CumulativeCostChart";
import { AnnualCostBreakdown } from "../results/AnnualCostBreakdown";
import { SensitivityChart } from "../results/SensitivityChart";
import { useHousingStore, DEFAULT_INPUT, defaultSelectedScenarios } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

beforeEach(() => {
  useHousingStore.setState({
    input: DEFAULT_INPUT,
    selectedScenarioIds: defaultSelectedScenarios("new-build"),
    currentStep: 0,
    visitedSteps: new Set([0]),
    result: null,
    calculateFailed: false,
    savedSimulations: [],
  });
});

describe("Dialog keyboard handling", () => {
  it("moves focus to the first control (not the close button), traps Tab, and returns focus on close", () => {
    const opener = document.createElement("button");
    opener.textContent = "open";
    document.body.appendChild(opener);
    opener.focus();

    const onChange = vi.fn();
    const { unmount } = render(
      <Dialog open onOpenChange={onChange} title="t" description="d">
        <input aria-label="first" />
        <button type="button">last</button>
      </Dialog>,
    );
    const first = screen.getByLabelText("first");
    const last = screen.getByRole("button", { name: "last" });
    expect(document.activeElement).toBe(first);

    // The page behind the dialog is inert while it is open
    expect(opener.hasAttribute("inert")).toBe(true);

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();

    // Tab from the last control wraps to the first focusable (the close button)
    last.focus();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "閉じる" }));

    // Shift+Tab from the first focusable wraps to the last one
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(last);

    unmount();
    expect(opener.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("keeps focus where autoFocus put it and leaves Tab alone with no focusable content", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <span>text only</span>
      </Dialog>,
    );
    // Only the close button is focusable, so it gets focus
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "閉じる" }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "閉じる" }));
  });

  it("does not re-run the focus setup when an inline onOpenChange changes identity", () => {
    // A real opener: a re-run effect would send focus back to it and then to the first input
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(
      <Dialog open onOpenChange={() => {}}>
        <input aria-label="a" />
        <input aria-label="b" />
      </Dialog>,
    );
    screen.getByLabelText("b").focus();
    rerender(
      <Dialog open onOpenChange={() => {}}>
        <input aria-label="a" />
        <input aria-label="b" />
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("b"));
    opener.remove();
  });

  it("returns focus to the opener even when a child took focus with autoFocus", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(
      <Dialog open onOpenChange={() => {}}>
        <input aria-label="before" />
        <input aria-label="auto" autoFocus />
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("auto"));
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("SaveDialog names its text field", () => {
    render(<SaveDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "名前" })).toBeTruthy();
  });
});

describe("Field group semantics", () => {
  it("wraps several controls in a named group when no control id is given", () => {
    render(
      <Field label="項目" hint="ヒント">
        <input type="checkbox" aria-label="x" />
      </Field>,
    );
    const group = screen.getByRole("group", { name: "項目" });
    expect(group.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("ヒント").id).toBe(group.getAttribute("aria-describedby"));
  });

  it("EconomyStep announces the subsidy list as a group", () => {
    render(<EconomyStep onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("group", { name: "適用する補助金" })).toBeTruthy();
  });
});

describe("Heading outline and landmarks", () => {
  it("the step title is the single level-one heading inside the main landmark", () => {
    render(<SimulatorApp />);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain("建物条件");
  });

  it("results: h1 for the page, h2 for scenario cards and section cards", () => {
    useHousingStore.setState({ currentStep: 5 });
    render(<ResultsStep onBack={() => {}} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // The only h3s are the four accordion headers under the "計算根拠" h2 (no skipped level)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toContain("初期費用の内訳");
    expect(h2).toContain("計算根拠");
  });

  it("CardTitle renders a heading element on request", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h3">見出し</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("見出し");
  });

  it("the cost table scroll container is focusable and named", () => {
    const output = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));
    render(<InitialCostBreakdown output={output} />);
    const region = screen.getByRole("region", { name: /初期費用の内訳/ });
    expect(region.getAttribute("tabindex")).toBe("0");
  });
});

describe("Chart captions (SHIG 96)", () => {
  const output = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));

  it("each chart carries a visually hidden caption with the plotted values", () => {
    const { container } = render(
      <>
        <CumulativeCostChart scenarios={output.scenarios} livingYears={DEFAULT_INPUT.livingYears} />
        <AnnualCostBreakdown
          scenarios={output.scenarios}
          electricityPrice={DEFAULT_INPUT.electricityPriceBuy}
          gasPrice={DEFAULT_INPUT.gasPrice}
          sellPriceFit={DEFAULT_INPUT.sellPriceFit}
        />
        <SensitivityChart input={DEFAULT_INPUT} />
      </>,
    );
    const captions = Array.from(container.querySelectorAll("figure > figcaption"));
    expect(captions).toHaveLength(3);
    for (const c of captions) {
      expect(c.classList.contains("sr-only")).toBe(true);
      expect(c.hasAttribute("hidden")).toBe(false);
      expect(c.textContent).toMatch(/\d/);
    }
    const [cumulative, annual] = captions.map((c) => c.textContent ?? "");
    for (const s of output.scenarios) {
      expect(cumulative).toContain(s.scenarioName);
      expect(cumulative).toContain(`${Math.round(s.cumulativeTotal / 10000).toLocaleString()}万円`);
      expect(annual).toContain(s.scenarioName);
    }
  });
});

describe("Landing page", () => {
  it("wraps the content in a main landmark", async () => {
    const { default: Home } = await import("@/app/page");
    render(<Home />);
    const main = screen.getByRole("main");
    expect(main.querySelector("#features")).toBeTruthy();
    expect(main.querySelector("#disclaimer")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "特徴" }));
  });
});
