// 住宅性能シミュレーター: 入力 / シナリオ / 結果の型定義

export type RegionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type InsulationPresetId =
  | "energy-saving" // 省エネ基準
  | "zeh"
  | "heat20-g1"
  | "heat20-g2"
  | "heat20-g3"
  | "custom";

export type WindowSpecId =
  | "alum-pair"
  | "alum-resin-pair-lowe"
  | "resin-pair-lowe"
  | "resin-triple-lowe";

export type WaterHeaterId =
  | "eco-cute" // エコキュート
  | "gas" // ガス給湯
  | "ene-farm"; // エネファーム

export type HeatingId =
  | "ac-only" // エアコン
  | "floor-heating" // 床暖房 + エアコン
  | "central-air"; // 全館空調

export type SolarOrientation = "south" | "south-east" | "south-west" | "east" | "west";

export type ElectricityRiseScenario = "flat" | "moderate" | "steep";

export type SimulationMode = "new-build" | "renovation";

export type AgeBracket = "before-1980" | "1980-1999" | "2000-2009" | "2010-later";

export type RenovationItemId =
  | "external-insulation"
  | "internal-insulation"
  | "ceiling-insulation"
  | "floor-insulation"
  | "inner-window"
  | "window-replacement"
  | "airtight-improvement";

export interface RenovationInput {
  /** 築年代から既存性能を推定 */
  ageBracket: AgeBracket;
  /** 残り想定居住年数（既定 20） */
  remainingYears: number;
  /** 現状 UA 値（ageBracket から自動セット、上書き可） */
  existingUa: number;
  /** 現状 C 値 */
  existingCValue: number;
  /** 現状 窓仕様 */
  existingWindow: WindowSpecId;
  /** 現状 給湯機器 */
  existingWaterHeater: WaterHeaterId;
  /** 現状 暖冷房 */
  existingHeating: HeatingId;
  /** 実施するリフォーム項目 */
  items: RenovationItemId[];
}

export type Prefecture =
  | "北海道" | "青森県" | "岩手県" | "宮城県" | "秋田県" | "山形県" | "福島県"
  | "茨城県" | "栃木県" | "群馬県" | "埼玉県" | "千葉県" | "東京都" | "神奈川県"
  | "新潟県" | "富山県" | "石川県" | "福井県" | "山梨県" | "長野県" | "岐阜県"
  | "静岡県" | "愛知県" | "三重県" | "滋賀県" | "京都府" | "大阪府" | "兵庫県"
  | "奈良県" | "和歌山県" | "鳥取県" | "島根県" | "岡山県" | "広島県" | "山口県"
  | "徳島県" | "香川県" | "愛媛県" | "高知県" | "福岡県" | "佐賀県" | "長崎県"
  | "熊本県" | "大分県" | "宮崎県" | "鹿児島県" | "沖縄県";

export interface HousingInput {
  /** 計算モード（新築 or 既築リフォーム） */
  mode: SimulationMode;

  /** 延床面積 m² */
  floorArea: number;
  /** 地域区分 1〜8 */
  region: RegionId;
  /** 家族人数 */
  household: number;
  /** 在宅時間帯（朝晩のみ / 日中も在宅） */
  presence: "evening-only" | "all-day";
  /** 想定居住年数 */
  livingYears: number;

  /** 都道府県（住所→地域自動判定の入力） */
  addressPrefecture?: Prefecture;
  /** 主要都市（任意。例外マップに無ければ未設定） */
  addressCity?: string;

  /** 断熱プリセット選択 */
  insulationPreset: InsulationPresetId;
  /** UA値 W/(m²·K) — プリセットから自動セット、手動編集可 */
  uaValue: number;
  /** C値 cm²/m² */
  cValue: number;
  /** 窓仕様 */
  windowSpec: WindowSpecId;

  /** 太陽光容量 kW */
  solarCapacity: number;
  /** 太陽光方位 */
  solarOrientation: SolarOrientation;
  /** 太陽光傾斜角 degree */
  solarTilt: number;
  /** 蓄電池容量 kWh */
  batteryCapacity: number;
  /** 給湯機器 */
  waterHeater: WaterHeaterId;
  /** 暖冷房方式 */
  heating: HeatingId;
  /** HEMS 有無 */
  hems: boolean;

  /** 電気料金単価 円/kWh（買電） */
  electricityPriceBuy: number;
  /** ガス料金 円/m³（採用時） */
  gasPrice: number;
  /** FIT 売電単価 円/kWh */
  sellPriceFit: number;
  /** 卒FIT後 売電単価 円/kWh */
  sellPricePostFit: number;
  /** 電気代上昇シナリオ */
  electricityRise: ElectricityRiseScenario;
  /** 適用する補助金 ID 一覧 */
  appliedSubsidyIds: string[];

  /** 既築リフォームモードの追加入力 */
  renovation?: RenovationInput;
}

/** 比較用シナリオ */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** プリセット由来か、ユーザー入力か */
  source: "preset" | "user";
  input: HousingInput;
}

/** 1シナリオの結果 */
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;

  /** 初期費用（補助金控除前） 円 */
  initialCostGross: number;
  /** 適用補助金合計 円 */
  subsidyTotal: number;
  /** 補助金控除後 初期費用 円 */
  initialCostNet: number;
  /** 標準仕様との初期費用差額（標準=正の値で割高） 円 */
  initialCostDelta: number;

  /** 年間: 暖冷房 電力消費 kWh */
  annualHeatingKwh: number;
  /** 年間: 給湯 電力 kWh（ガス併用時の電力相当も含む） */
  annualHotWaterKwh: number;
  /** 年間: 給湯 ガス消費 m³ */
  annualHotWaterGas: number;
  /** 年間: その他家電 kWh */
  annualOtherKwh: number;
  /** 年間: 太陽光発電量 kWh */
  annualSolarKwh: number;
  /** 自家消費率 0〜1 */
  selfConsumptionRate: number;

  /** 1年目: 年間光熱費（売電収入差し引き後） 円 */
  firstYearEnergyCost: number;
  /** 1年目: 売電収入 円 */
  firstYearSellRevenue: number;

  /** 年次キャッシュフロー（年単位、初年度=index 0） */
  yearly: YearlyEntry[];

  /** 30年（または livingYears）累計コスト 円 = 初期費用net + Σ年間光熱費 */
  cumulativeTotal: number;

  /** CO2 削減量（標準比） kg/年 — 標準シナリオでは 0 */
  annualCo2Reduction: number;
  /** 居住年数累積 CO2 削減量 kg */
  cumulativeCo2Reduction: number;
}

export interface YearlyEntry {
  year: number; // 0..livingYears-1
  energyCost: number; // 当年の光熱費（売電差し引き後）
  cumulative: number; // 当年までの累計（初期費用net 込み）
}

export interface SimulationOutput {
  inputAtCalc: HousingInput;
  scenarios: ScenarioResult[];
  /** 比較基準 = 標準仕様シナリオの id */
  baselineId: string;
  /** 投資回収年数 マップ scenarioId -> years (Infinity なら回収不可) */
  paybackYears: Record<string, number>;
  /** 計算で使用した前提値スナップショット */
  assumptions: AssumptionSnapshot;
}

export interface AssumptionSnapshot {
  /** kg-CO2/kWh */
  co2EmissionFactorElectricity: number;
  /** kg-CO2/m³ */
  co2EmissionFactorGas: number;
  /** 太陽光損失係数 */
  solarLossFactor: number;
  /** その他家電 kWh/人/年（生活係数） */
  otherKwhPerPersonYear: number;
  /** 電気代上昇率 適用値 */
  electricityRisePercent: number;
  /** FIT 期間 年 */
  fitYears: number;
}

export interface SubsidyMaster {
  id: string;
  name: string;
  /** 円 */
  amount: number;
  /** 適用条件: ZEH 以上 / G2 以上 等 */
  description: string;
  /** 自動マッチ条件: 必要な insulationPreset 最低ライン */
  requiredInsulation?: InsulationPresetId;
  /** 自動マッチ条件: 太陽光必須 */
  requiresSolar?: boolean;
  /** 対象地域（未指定なら全国） */
  regionScope?: "national" | "prefecture";
  lastUpdated: string; // YYYY-MM-DD
  source: string;
}

/** 保存済みシミュレーション */
export interface SavedSimulation {
  id: string;
  name: string;
  /** ISO 8601 */
  savedAt: string;
  schemaVersion: number;
  input: HousingInput;
  /** 一覧表示用の軽量サマリ */
  summary?: {
    cumulativeTotal: number; // ユーザーシナリオの累計
    initialCostNet: number;
    livingYears: number;
  };
}
