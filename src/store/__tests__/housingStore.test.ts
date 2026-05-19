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
  describe("定数 / ヘルパー", () => {
    it("STEP_IDS は STEP_IDS_NEW_BUILD と一致 (後方互換)", () => {
      expect(STEP_IDS).toBe(STEP_IDS_NEW_BUILD);
    });
    it("getStepIds: モード別ステップ", () => {
      expect(getStepIds("new-build")).toEqual(STEP_IDS_NEW_BUILD);
      expect(getStepIds("renovation")).toEqual(STEP_IDS_RENOVATION);
    });
    it("defaultSelectedScenarios: モード別", () => {
      expect(defaultSelectedScenarios("new-build")).toContain("preset-baseline");
      expect(defaultSelectedScenarios("renovation")).toContain("renovation-as-is");
    });
  });

  describe("step / visitedSteps", () => {
    it("setStep: step を更新し visitedSteps に追加", () => {
      useHousingStore.getState().setStep(3);
      const s = useHousingStore.getState();
      expect(s.currentStep).toBe(3);
      expect(s.visitedSteps.has(3)).toBe(true);
    });
    it("visit: 指定 step を訪問済みにマーク（currentStep は変えない）", () => {
      useHousingStore.getState().visit(2);
      expect(useHousingStore.getState().visitedSteps.has(2)).toBe(true);
      expect(useHousingStore.getState().currentStep).toBe(0);
    });
  });

  describe("updateInput", () => {
    it("部分パッチで更新", () => {
      useHousingStore.getState().updateInput({ floorArea: 130 });
      expect(useHousingStore.getState().input.floorArea).toBe(130);
    });
  });

  describe("setMode", () => {
    it("renovation に切り替えると visited/step/scenarios もリセット", () => {
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
    it("prefecture と city から region 推定 + 断熱 UA 再セット", () => {
      useHousingStore.getState().setAddress("北海道", "旭川市");
      const s = useHousingStore.getState();
      expect(s.input.addressPrefecture).toBe("北海道");
      expect(s.input.addressCity).toBe("旭川市");
      expect(s.input.region).toBe(1);
      // energy-saving プリセットの 1 地域 UA は 0.46
      expect(s.input.uaValue).toBe(0.46);
    });

    it("city なしは都道府県デフォルト", () => {
      useHousingStore.getState().setAddress("東京都");
      const s = useHousingStore.getState();
      expect(s.input.region).toBe(6);
    });

    it("prefecture undefined はアドレスをクリア", () => {
      useHousingStore.getState().setAddress("東京都");
      useHousingStore.getState().setAddress(undefined);
      const s = useHousingStore.getState();
      expect(s.input.addressPrefecture).toBeUndefined();
      expect(s.input.addressCity).toBeUndefined();
    });

    it("custom preset の場合は地域変更でも UA を上書きしない", () => {
      useHousingStore.getState().updateInput({ insulationPreset: "custom", uaValue: 0.33 });
      useHousingStore.getState().setAddress("北海道", "旭川市");
      expect(useHousingStore.getState().input.uaValue).toBe(0.33);
    });
  });

  describe("selectedScenarioIds", () => {
    it("setSelectedScenarioIds: 配列で置換", () => {
      useHousingStore.getState().setSelectedScenarioIds(["a", "b"]);
      expect(useHousingStore.getState().selectedScenarioIds).toEqual(["a", "b"]);
    });
    it("toggleScenario: 含まれていなければ追加、含まれていれば除外", () => {
      useHousingStore.getState().setSelectedScenarioIds([]);
      useHousingStore.getState().toggleScenario("x");
      expect(useHousingStore.getState().selectedScenarioIds).toEqual(["x"]);
      useHousingStore.getState().toggleScenario("x");
      expect(useHousingStore.getState().selectedScenarioIds).toEqual([]);
    });
  });

  describe("calculate", () => {
    it("選択シナリオで実行 → result セット", () => {
      useHousingStore.getState().calculate();
      const s = useHousingStore.getState();
      expect(s.result).not.toBeNull();
      expect(s.isCalculating).toBe(false);
    });

    it("選択ゼロなら全シナリオ", () => {
      useHousingStore.getState().setSelectedScenarioIds([]);
      useHousingStore.getState().calculate();
      const result = useHousingStore.getState().result!;
      expect(result.scenarios.length).toBeGreaterThan(0);
    });

    it("内部 throw 時は isCalculating だけ false に (renovation mode + renovation 未設定で crash)", () => {
      useHousingStore.getState().setMode("renovation");
      // renovation 未設定状態で計算 → 内部で baseline 不在 → throw
      useHousingStore.getState().calculate();
      expect(useHousingStore.getState().isCalculating).toBe(false);
    });
  });

  describe("reset", () => {
    it("全状態を初期化", () => {
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
    it("外部入力から状態を復元", () => {
      useHousingStore.getState().hydrateFromInput({ ...DEFAULT_INPUT, floorArea: 150 });
      const s = useHousingStore.getState();
      expect(s.input.floorArea).toBe(150);
      // currentStep が最終ステップに
      expect(s.currentStep).toBe(STEP_IDS_NEW_BUILD.length - 1);
    });
    it("renovation モードの入力でも適切に展開", () => {
      useHousingStore.getState().hydrateFromInput({ ...DEFAULT_INPUT, mode: "renovation" });
      expect(useHousingStore.getState().currentStep).toBe(STEP_IDS_RENOVATION.length - 1);
    });
  });

  describe("saveCurrent / loadSaved / deleteSaved", () => {
    it("saveCurrent: 計算なしでも保存 (summary undefined)", () => {
      const entry = useHousingStore.getState().saveCurrent("first");
      expect(entry.name).toBe("first");
      expect(entry.summary).toBeUndefined();
      expect(useHousingStore.getState().savedSimulations).toHaveLength(1);
    });

    it("saveCurrent: 計算ありで summary 同梱", () => {
      useHousingStore.getState().calculate();
      const entry = useHousingStore.getState().saveCurrent("with-result");
      expect(entry.summary).toBeDefined();
      expect(entry.summary?.livingYears).toBe(30);
    });

    it("saveCurrent: 空名は自動命名", () => {
      const entry = useHousingStore.getState().saveCurrent("   ");
      expect(entry.name).toContain("名称未設定");
    });

    it("saveCurrent: 上限20件で古いものは切り捨て", () => {
      for (let i = 0; i < 25; i++) useHousingStore.getState().saveCurrent(`s${i}`);
      expect(useHousingStore.getState().savedSimulations).toHaveLength(20);
      // 最新が先頭
      expect(useHousingStore.getState().savedSimulations[0].name).toBe("s24");
    });

    it("loadSaved: 保存済みから入力を復元", () => {
      useHousingStore.getState().updateInput({ floorArea: 145 });
      useHousingStore.getState().saveCurrent("v1");
      const id = useHousingStore.getState().savedSimulations[0].id;
      useHousingStore.getState().updateInput({ floorArea: 200 });
      useHousingStore.getState().loadSaved(id);
      expect(useHousingStore.getState().input.floorArea).toBe(145);
    });

    it("loadSaved: 存在しないIDは何もしない", () => {
      useHousingStore.getState().loadSaved("nope");
      expect(useHousingStore.getState().input.floorArea).toBe(120);
    });

    it("deleteSaved: 指定IDを削除", () => {
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
    it("入力が localStorage に保存される", () => {
      useHousingStore.getState().updateInput({ floorArea: 175 });
      const raw = localStorage.getItem("housing-performance-simulator");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.input.floorArea).toBe(175);
    });
  });
});
