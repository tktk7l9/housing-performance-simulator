/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  useHousingStore,
  DEFAULT_INPUT,
  STEP_IDS,
  STEP_IDS_NEW_BUILD,
  STEP_IDS_RENOVATION,
  getStepIds,
  defaultSelectedScenarios,
} from "../housingStore";

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

describe("housingStore", () => {
  describe("constants and helpers", () => {
    it("STEP_IDS equals STEP_IDS_NEW_BUILD (backward compatibility)", () => {
      expect(STEP_IDS).toBe(STEP_IDS_NEW_BUILD);
    });
    it("getStepIds returns steps per mode", () => {
      expect(getStepIds("new-build")).toEqual(STEP_IDS_NEW_BUILD);
      expect(getStepIds("renovation")).toEqual(STEP_IDS_RENOVATION);
    });
    it("defaultSelectedScenarios per mode", () => {
      expect(defaultSelectedScenarios("new-build")).toContain("preset-baseline");
      expect(defaultSelectedScenarios("renovation")).toContain("renovation-as-is");
    });
  });

  describe("step / visitedSteps", () => {
    it("setStep updates the step and adds it to visitedSteps", () => {
      useHousingStore.getState().setStep(3);
      const s = useHousingStore.getState();
      expect(s.currentStep).toBe(3);
      expect(s.visitedSteps.has(3)).toBe(true);
    });
    it("visit marks a step as visited without changing currentStep", () => {
      useHousingStore.getState().visit(2);
      expect(useHousingStore.getState().visitedSteps.has(2)).toBe(true);
      expect(useHousingStore.getState().currentStep).toBe(0);
    });
  });

  describe("updateInput", () => {
    it("updates with a partial patch", () => {
      useHousingStore.getState().updateInput({ floorArea: 130 });
      expect(useHousingStore.getState().input.floorArea).toBe(130);
    });
  });

  describe("setMode", () => {
    it("switching to renovation resets visited steps, step and scenarios", () => {
      useHousingStore.getState().setStep(2);
      useHousingStore.getState().setMode("renovation");
      const s = useHousingStore.getState();
      expect(s.input.mode).toBe("renovation");
      expect(s.currentStep).toBe(0);
      expect(s.visitedSteps).toEqual(new Set([0]));
      expect(s.selectedScenarioIds).toContain("renovation-as-is");
      expect(s.result).toBeNull();
    });
  });

  describe("setAddress", () => {
    it("infers region from prefecture and city and resets the insulation UA", () => {
      useHousingStore.getState().setAddress("北海道", "旭川市");
      const s = useHousingStore.getState();
      expect(s.input.addressPrefecture).toBe("北海道");
      expect(s.input.addressCity).toBe("旭川市");
      expect(s.input.region).toBe(1);
      // The region-1 UA of the energy-saving preset is 0.46
      expect(s.input.uaValue).toBe(0.46);
    });

    it("uses the prefecture default without a city", () => {
      useHousingStore.getState().setAddress("東京都");
      const s = useHousingStore.getState();
      expect(s.input.region).toBe(6);
    });

    it("clears the address when prefecture is undefined", () => {
      useHousingStore.getState().setAddress("東京都");
      useHousingStore.getState().setAddress(undefined);
      const s = useHousingStore.getState();
      expect(s.input.addressPrefecture).toBeUndefined();
      expect(s.input.addressCity).toBeUndefined();
    });

    it("keeps UA on region change with the custom preset", () => {
      useHousingStore.getState().updateInput({ insulationPreset: "custom", uaValue: 0.33 });
      useHousingStore.getState().setAddress("北海道", "旭川市");
      expect(useHousingStore.getState().input.uaValue).toBe(0.33);
    });
  });

  describe("selectedScenarioIds", () => {
    it("setSelectedScenarioIds replaces the array", () => {
      useHousingStore.getState().setSelectedScenarioIds(["a", "b"]);
      expect(useHousingStore.getState().selectedScenarioIds).toEqual(["a", "b"]);
    });
    it("toggleScenario adds a missing id and removes a present one", () => {
      useHousingStore.getState().setSelectedScenarioIds([]);
      useHousingStore.getState().toggleScenario("x");
      expect(useHousingStore.getState().selectedScenarioIds).toEqual(["x"]);
      useHousingStore.getState().toggleScenario("x");
      expect(useHousingStore.getState().selectedScenarioIds).toEqual([]);
    });
  });

  describe("calculate", () => {
    it("runs the selected scenarios and sets result", () => {
      useHousingStore.getState().calculate();
      const s = useHousingStore.getState();
      expect(s.result).not.toBeNull();
      expect(s.isCalculating).toBe(false);
    });

    it("runs all scenarios when none are selected", () => {
      useHousingStore.getState().setSelectedScenarioIds([]);
      useHousingStore.getState().calculate();
      const result = useHousingStore.getState().result!;
      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("resets isCalculating when the run throws (renovation mode without renovation)", () => {
      useHousingStore.getState().setMode("renovation");
      // Calculate with renovation unset -> no baseline internally -> throw
      useHousingStore.getState().calculate();
      expect(useHousingStore.getState().isCalculating).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets all state", () => {
      useHousingStore.getState().updateInput({ floorArea: 200 });
      useHousingStore.getState().setStep(3);
      useHousingStore.getState().calculate();
      useHousingStore.getState().reset();
      const s = useHousingStore.getState();
      expect(s.input.floorArea).toBe(120);
      expect(s.currentStep).toBe(0);
      expect(s.visitedSteps).toEqual(new Set([0]));
      expect(s.result).toBeNull();
    });
  });

  describe("hydrateFromInput", () => {
    it("restores state from external input", () => {
      useHousingStore.getState().hydrateFromInput({ ...DEFAULT_INPUT, floorArea: 150 });
      const s = useHousingStore.getState();
      expect(s.input.floorArea).toBe(150);
      // currentStep becomes the last step
      expect(s.currentStep).toBe(STEP_IDS_NEW_BUILD.length - 1);
    });
    it("expands renovation-mode input correctly", () => {
      useHousingStore.getState().hydrateFromInput({ ...DEFAULT_INPUT, mode: "renovation" });
      expect(useHousingStore.getState().currentStep).toBe(STEP_IDS_RENOVATION.length - 1);
    });
  });

  describe("saveCurrent / loadSaved / deleteSaved", () => {
    it("saveCurrent saves without a result (summary undefined)", () => {
      const entry = useHousingStore.getState().saveCurrent("first");
      expect(entry.name).toBe("first");
      expect(entry.summary).toBeUndefined();
      expect(useHousingStore.getState().savedSimulations).toHaveLength(1);
    });

    it("saveCurrent includes the summary with a result", () => {
      useHousingStore.getState().calculate();
      const entry = useHousingStore.getState().saveCurrent("with-result");
      expect(entry.summary).toBeDefined();
      expect(entry.summary?.livingYears).toBe(30);
    });

    it("saveCurrent auto-names an empty name", () => {
      const entry = useHousingStore.getState().saveCurrent("   ");
      expect(entry.name).toContain("名称未設定");
    });

    it("saveCurrent keeps at most 20 and drops the oldest", () => {
      for (let i = 0; i < 25; i++) useHousingStore.getState().saveCurrent(`s${i}`);
      expect(useHousingStore.getState().savedSimulations).toHaveLength(20);
      // Newest first
      expect(useHousingStore.getState().savedSimulations[0].name).toBe("s24");
    });

    it("loadSaved restores the input from a save", () => {
      useHousingStore.getState().updateInput({ floorArea: 145 });
      useHousingStore.getState().saveCurrent("v1");
      const id = useHousingStore.getState().savedSimulations[0].id;
      useHousingStore.getState().updateInput({ floorArea: 200 });
      useHousingStore.getState().loadSaved(id);
      expect(useHousingStore.getState().input.floorArea).toBe(145);
    });

    it("loadSaved ignores an unknown ID", () => {
      useHousingStore.getState().loadSaved("nope");
      expect(useHousingStore.getState().input.floorArea).toBe(120);
    });

    it("deleteSaved removes the given ID", () => {
      useHousingStore.getState().saveCurrent("A");
      useHousingStore.getState().saveCurrent("B");
      const id = useHousingStore.getState().savedSimulations[1].id;
      useHousingStore.getState().deleteSaved(id);
      const list = useHousingStore.getState().savedSimulations;
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("B");
    });
  });

  describe("persist", () => {
    it("persists the input to localStorage", () => {
      useHousingStore.getState().updateInput({ floorArea: 175 });
      const raw = localStorage.getItem("housing-performance-simulator");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.input.floorArea).toBe(175);
    });
  });
});
