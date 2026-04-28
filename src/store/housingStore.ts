import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  HousingInput,
  Prefecture,
  SavedSimulation,
  SimulationMode,
  SimulationOutput,
} from "@/lib/housing/types";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";
import { INSULATION_PRESETS } from "@/lib/housing/data/insulationPresets";
import {
  DEFAULT_ELECTRICITY_PRICE,
  DEFAULT_GAS_PRICE,
  DEFAULT_SELL_PRICE_FIT,
  DEFAULT_SELL_PRICE_POST_FIT,
} from "@/lib/housing/data/electricityPlans";
import { lookupRegion } from "@/lib/housing/data/regionLookup";
import { CURRENT_SCHEMA_VERSION, migrateInput } from "@/lib/housing/schema";

export const STEP_IDS_NEW_BUILD = [
  "building",
  "performance",
  "equipment",
  "economy",
  "scenario",
  "results",
] as const;

export const STEP_IDS_RENOVATION = [
  "building",
  "renovation",
  "economy",
  "scenario",
  "results",
] as const;

export type StepId =
  | (typeof STEP_IDS_NEW_BUILD)[number]
  | (typeof STEP_IDS_RENOVATION)[number];

export function getStepIds(mode: SimulationMode): readonly StepId[] {
  return mode === "renovation" ? STEP_IDS_RENOVATION : STEP_IDS_NEW_BUILD;
}

const SAVED_LIMIT = 20;

interface HousingStore {
  currentStep: number;
  visitedSteps: Set<number>;
  input: HousingInput;
  selectedScenarioIds: string[];
  result: SimulationOutput | null;
  isCalculating: boolean;
  savedSimulations: SavedSimulation[];

  setStep: (step: number) => void;
  visit: (step: number) => void;
  updateInput: (patch: Partial<HousingInput>) => void;
  setMode: (mode: SimulationMode) => void;
  setAddress: (prefecture: Prefecture | undefined, city?: string) => void;
  setSelectedScenarioIds: (ids: string[]) => void;
  toggleScenario: (id: string) => void;
  calculate: () => void;
  reset: () => void;
  hydrateFromInput: (input: HousingInput) => void;

  saveCurrent: (name: string) => SavedSimulation;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
}

export const DEFAULT_INPUT: HousingInput = {
  mode: "new-build",

  floorArea: 120,
  region: 6,
  household: 4,
  presence: "evening-only",
  livingYears: 30,

  insulationPreset: "energy-saving",
  uaValue: INSULATION_PRESETS["energy-saving"].uaByRegion[6],
  cValue: INSULATION_PRESETS["energy-saving"].cValue,
  windowSpec: "alum-resin-pair-lowe",

  solarCapacity: 5,
  solarOrientation: "south",
  solarTilt: 30,
  batteryCapacity: 0,
  waterHeater: "eco-cute",
  heating: "ac-only",
  hems: false,

  electricityPriceBuy: DEFAULT_ELECTRICITY_PRICE,
  gasPrice: DEFAULT_GAS_PRICE,
  sellPriceFit: DEFAULT_SELL_PRICE_FIT,
  sellPricePostFit: DEFAULT_SELL_PRICE_POST_FIT,
  electricityRise: "moderate",
  appliedSubsidyIds: [],
};

const DEFAULT_SELECTED_SCENARIOS_NEW_BUILD = [
  "preset-baseline",
  "preset-high-performance",
  "preset-high-perf-solar-battery",
  "user",
];

const DEFAULT_SELECTED_SCENARIOS_RENOVATION = [
  "renovation-as-is",
  "renovation-applied",
];

export function defaultSelectedScenarios(mode: SimulationMode): string[] {
  return mode === "renovation"
    ? [...DEFAULT_SELECTED_SCENARIOS_RENOVATION]
    : [...DEFAULT_SELECTED_SCENARIOS_NEW_BUILD];
}

export const useHousingStore = create<HousingStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      visitedSteps: new Set([0]),
      input: DEFAULT_INPUT,
      selectedScenarioIds: DEFAULT_SELECTED_SCENARIOS_NEW_BUILD,
      result: null,
      isCalculating: false,
      savedSimulations: [],

      setStep: (step) =>
        set((s) => {
          const visited = new Set(s.visitedSteps);
          visited.add(step);
          return { currentStep: step, visitedSteps: visited };
        }),
      visit: (step) =>
        set((s) => {
          const visited = new Set(s.visitedSteps);
          visited.add(step);
          return { visitedSteps: visited };
        }),

      updateInput: (patch) => set((s) => ({ input: { ...s.input, ...patch } })),

      setMode: (mode) =>
        set((s) => ({
          input: { ...s.input, mode },
          currentStep: 0,
          visitedSteps: new Set([0]),
          selectedScenarioIds: defaultSelectedScenarios(mode),
          result: null,
        })),

      setAddress: (prefecture, city) =>
        set((s) => {
          if (!prefecture) {
            return {
              input: { ...s.input, addressPrefecture: undefined, addressCity: undefined },
            };
          }
          const { region } = lookupRegion(prefecture, city);
          // 断熱プリセットが UA を地域で持つので、地域変更時に再セット
          const preset = s.input.insulationPreset;
          const ua =
            preset !== "custom"
              ? INSULATION_PRESETS[preset].uaByRegion[region]
              : s.input.uaValue;
          return {
            input: {
              ...s.input,
              addressPrefecture: prefecture,
              addressCity: city,
              region,
              uaValue: ua,
            },
          };
        }),

      setSelectedScenarioIds: (ids) => set({ selectedScenarioIds: ids }),
      toggleScenario: (id) =>
        set((s) => ({
          selectedScenarioIds: s.selectedScenarioIds.includes(id)
            ? s.selectedScenarioIds.filter((x) => x !== id)
            : [...s.selectedScenarioIds, id],
        })),

      calculate: () => {
        set({ isCalculating: true });
        try {
          const { input, selectedScenarioIds } = get();
          const all = buildAllScenarios(input);
          const selected = all.filter((s) => selectedScenarioIds.includes(s.id));
          const scenarios = selected.length > 0 ? selected : all;
          const result = runSimulation(input, scenarios);
          set({ result, isCalculating: false });
        } catch (e) {
          console.error("calculate failed", e);
          set({ isCalculating: false });
        }
      },

      reset: () =>
        set({
          currentStep: 0,
          visitedSteps: new Set([0]),
          input: DEFAULT_INPUT,
          selectedScenarioIds: DEFAULT_SELECTED_SCENARIOS_NEW_BUILD,
          result: null,
        }),

      hydrateFromInput: (input) => {
        const safe = migrateInput(input);
        set({
          input: safe,
          currentStep: getStepIds(safe.mode).length - 1,
          visitedSteps: new Set(getStepIds(safe.mode).map((_, i) => i)),
          selectedScenarioIds: defaultSelectedScenarios(safe.mode),
          result: null,
        });
      },

      saveCurrent: (name) => {
        const { input, result, savedSimulations } = get();
        const userScenario = result?.scenarios.find((s) => s.scenarioId === "user");
        const summary = userScenario
          ? {
              cumulativeTotal: userScenario.cumulativeTotal,
              initialCostNet: userScenario.initialCostNet,
              livingYears: input.livingYears,
            }
          : undefined;
        const entry: SavedSimulation = {
          id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: name.trim() || `名称未設定 ${new Date().toLocaleString("ja-JP")}`,
          savedAt: new Date().toISOString(),
          schemaVersion: CURRENT_SCHEMA_VERSION,
          input,
          summary,
        };
        const next = [entry, ...savedSimulations].slice(0, SAVED_LIMIT);
        set({ savedSimulations: next });
        return entry;
      },

      loadSaved: (id) => {
        const sim = get().savedSimulations.find((s) => s.id === id);
        if (!sim) return;
        const safe = migrateInput(sim.input);
        set({
          input: safe,
          selectedScenarioIds: defaultSelectedScenarios(safe.mode),
          currentStep: getStepIds(safe.mode).length - 1,
          visitedSteps: new Set(getStepIds(safe.mode).map((_, i) => i)),
          result: null,
        });
      },

      deleteSaved: (id) =>
        set((s) => ({
          savedSimulations: s.savedSimulations.filter((x) => x.id !== id),
        })),
    }),
    {
      name: "housing-performance-simulator",
      version: 2,
      migrate: (persisted, fromVersion) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as { input?: Partial<HousingInput> };
        if (fromVersion < 2 && p.input) {
          p.input = migrateInput(p.input);
        }
        return persisted;
      },
      partialize: (state) => ({
        input: state.input,
        currentStep: state.currentStep,
        selectedScenarioIds: state.selectedScenarioIds,
        savedSimulations: state.savedSimulations,
      }),
    }
  )
);

/** 後方互換のため旧名をエクスポート */
export const STEP_IDS = STEP_IDS_NEW_BUILD;
