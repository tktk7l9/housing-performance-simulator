// Housing performance simulator: type definitions for input / scenario / result

export type RegionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type InsulationPresetId =
  | "energy-saving" // energy-saving standard
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
  | "eco-cute" // EcoCute (heat-pump water heater)
  | "gas" // gas water heater
  | "ene-farm"; // Ene-Farm (fuel cell)

export type HeatingId =
  | "ac-only" // air conditioner
  | "floor-heating" // floor heating + air conditioner
  | "central-air"; // whole-house air conditioning

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
  /** Estimate existing performance from construction era */
  ageBracket: AgeBracket;
  /** Remaining expected years of residence (default 20) */
  remainingYears: number;
  /** Current UA value (set automatically from ageBracket, can be overridden) */
  existingUa: number;
  /** Current C value */
  existingCValue: number;
  /** Current window spec */
  existingWindow: WindowSpecId;
  /** Current water heater */
  existingWaterHeater: WaterHeaterId;
  /** Current heating/cooling */
  existingHeating: HeatingId;
  /** Renovation items to carry out */
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
  /** Calculation mode (new build or renovation of an existing house) */
  mode: SimulationMode;

  /** Total floor area m² */
  floorArea: number;
  /** Climate region 1-8 */
  region: RegionId;
  /** Household size */
  household: number;
  /** At-home hours (mornings and evenings only / also during the day) */
  presence: "evening-only" | "all-day";
  /** Expected years of residence */
  livingYears: number;

  /** Prefecture (input for automatic address -> region detection) */
  addressPrefecture?: Prefecture;
  /** Major city (optional; unset if not in the exception map) */
  addressCity?: string;

  /** Selected insulation preset */
  insulationPreset: InsulationPresetId;
  /** UA value W/(m²·K) — set automatically from the preset, can be edited manually */
  uaValue: number;
  /** C value cm²/m² */
  cValue: number;
  /** Window spec */
  windowSpec: WindowSpecId;

  /** Solar capacity kW */
  solarCapacity: number;
  /** Solar orientation */
  solarOrientation: SolarOrientation;
  /** Solar tilt angle, degrees */
  solarTilt: number;
  /** Battery capacity kWh */
  batteryCapacity: number;
  /** Water heater */
  waterHeater: WaterHeaterId;
  /** Heating/cooling system */
  heating: HeatingId;
  /** Whether HEMS is installed */
  hems: boolean;

  /** Electricity unit price yen/kWh (purchased) */
  electricityPriceBuy: number;
  /** Gas price yen/m³ (when used) */
  gasPrice: number;
  /** FIT feed-in unit price yen/kWh */
  sellPriceFit: number;
  /** Post-FIT (卒FIT) feed-in unit price yen/kWh */
  sellPricePostFit: number;
  /** Electricity price rise scenario */
  electricityRise: ElectricityRiseScenario;
  /** List of subsidy IDs to apply */
  appliedSubsidyIds: string[];

  /** Additional input for renovation mode */
  renovation?: RenovationInput;
}

/** Scenario for comparison */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** Whether it comes from a preset or from user input */
  source: "preset" | "user";
  input: HousingInput;
}

/** Result of a single scenario */
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;

  /** Initial cost (before subsidies), yen */
  initialCostGross: number;
  /** Total applied subsidies, yen */
  subsidyTotal: number;
  /** Initial cost after subsidies, yen */
  initialCostNet: number;
  /** Initial cost difference from the standard spec (positive = more expensive than standard), yen */
  initialCostDelta: number;

  /** Annual: heating/cooling electricity consumption kWh */
  annualHeatingKwh: number;
  /** Annual: hot water electricity kWh (including electricity equivalent when combined with gas) */
  annualHotWaterKwh: number;
  /** Annual: hot water gas consumption m³ */
  annualHotWaterGas: number;
  /** Annual: other appliances kWh */
  annualOtherKwh: number;
  /** Annual: solar generation kWh */
  annualSolarKwh: number;
  /** Self-consumption rate 0-1 */
  selfConsumptionRate: number;

  /** Year 1: annual utility cost (after subtracting feed-in revenue), yen */
  firstYearEnergyCost: number;
  /** Year 1: feed-in revenue, yen */
  firstYearSellRevenue: number;

  /** Yearly cash flow (per year, first year = index 0) */
  yearly: YearlyEntry[];

  /** 30-year (or livingYears) cumulative cost, yen = net initial cost + Σ annual utility cost */
  cumulativeTotal: number;

  /** CO2 reduction (vs. standard) kg/year — 0 for the standard scenario */
  annualCo2Reduction: number;
  /** Cumulative CO2 reduction over the years of residence, kg */
  cumulativeCo2Reduction: number;
}

export interface YearlyEntry {
  year: number; // 0..livingYears-1
  energyCost: number; // Utility cost for the year (after subtracting feed-in revenue)
  cumulative: number; // Cumulative total up to this year (including net initial cost)
}

export interface SimulationOutput {
  inputAtCalc: HousingInput;
  scenarios: ScenarioResult[];
  /** Comparison baseline = id of the standard spec scenario */
  baselineId: string;
  /** Payback years map scenarioId -> years (Infinity means never pays back) */
  paybackYears: Record<string, number>;
  /** Snapshot of the assumptions used in the calculation */
  assumptions: AssumptionSnapshot;
}

export interface AssumptionSnapshot {
  /** kg-CO2/kWh */
  co2EmissionFactorElectricity: number;
  /** kg-CO2/m³ */
  co2EmissionFactorGas: number;
  /** Solar loss factor */
  solarLossFactor: number;
  /** Other appliances kWh/person/year (lifestyle factor) */
  otherKwhPerPersonYear: number;
  /** Applied electricity price rise rate */
  electricityRisePercent: number;
  /** FIT period, years */
  fitYears: number;
}

export interface SubsidyMaster {
  id: string;
  name: string;
  /** yen */
  amount: number;
  /** Eligibility: ZEH or above / G2 or above, etc. */
  description: string;
  /** Auto-match condition: minimum required insulationPreset */
  requiredInsulation?: InsulationPresetId;
  /** Auto-match condition: solar required */
  requiresSolar?: boolean;
  /** Eligible regions (nationwide if unspecified) */
  regionScope?: "national" | "prefecture";
  lastUpdated: string; // YYYY-MM-DD
  source: string;
}

/** Saved simulation */
export interface SavedSimulation {
  id: string;
  name: string;
  /** ISO 8601 */
  savedAt: string;
  schemaVersion: number;
  input: HousingInput;
  /** Lightweight summary for list display */
  summary?: {
    cumulativeTotal: number; // Cumulative total of the user scenario
    initialCostNet: number;
    livingYears: number;
  };
}
