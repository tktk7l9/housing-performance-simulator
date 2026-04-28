// 保存・共有データのスキーマバージョン管理 + 実行時バリデーション
//
// 共有 URL や localStorage 由来の入力は信用しない。`sanitizeInput` で
//   - 数値を安全な範囲にクランプ（DoS 対策: livingYears の上限など）
//   - 列挙型を許可集合とマッチ（外れたら既定値）
//   - 不足フィールドを既定値で補完
// したうえで `HousingInput` を返す。
//
// バージョン履歴:
//   v1 … 初期構築（新築のみ）
//   v2 … mode (new-build|renovation) と renovation 入力を追加

import type {
  AgeBracket,
  ElectricityRiseScenario,
  HeatingId,
  HousingInput,
  InsulationPresetId,
  Prefecture,
  RegionId,
  RenovationInput,
  RenovationItemId,
  SimulationMode,
  SolarOrientation,
  WaterHeaterId,
  WindowSpecId,
} from "./types";

export const CURRENT_SCHEMA_VERSION = 2;

/** 保存・共有時のエンベロープ */
export interface InputEnvelope {
  schemaVersion: number;
  input: HousingInput;
}

// ── 既定値（sanitize の fallback） ─────────────────────────────────
//   store の DEFAULT_INPUT と循環依存になるためここで小規模なフォールバック値を持つ。
//   厳密値は呼び出し側のフォーム既定値で上書きされる。
const FALLBACK = {
  mode: "new-build" as SimulationMode,
  floorArea: 120,
  region: 6 as RegionId,
  household: 4,
  presence: "evening-only" as const,
  livingYears: 30,
  insulationPreset: "energy-saving" as InsulationPresetId,
  uaValue: 0.87,
  cValue: 5.0,
  windowSpec: "alum-resin-pair-lowe" as WindowSpecId,
  solarCapacity: 0,
  solarOrientation: "south" as SolarOrientation,
  solarTilt: 30,
  batteryCapacity: 0,
  waterHeater: "eco-cute" as WaterHeaterId,
  heating: "ac-only" as HeatingId,
  hems: false,
  electricityPriceBuy: 32,
  gasPrice: 200,
  sellPriceFit: 15,
  sellPricePostFit: 8,
  electricityRise: "moderate" as ElectricityRiseScenario,
};

// ── 列挙の許可集合 ─────────────────────────────────────────────────
const MODES: SimulationMode[] = ["new-build", "renovation"];
const PRESENCES = ["evening-only", "all-day"] as const;
const INSULATION_PRESETS: InsulationPresetId[] = [
  "energy-saving",
  "zeh",
  "heat20-g1",
  "heat20-g2",
  "heat20-g3",
  "custom",
];
const WINDOW_SPECS: WindowSpecId[] = [
  "alum-pair",
  "alum-resin-pair-lowe",
  "resin-pair-lowe",
  "resin-triple-lowe",
];
const WATER_HEATERS: WaterHeaterId[] = ["eco-cute", "gas", "ene-farm"];
const HEATINGS: HeatingId[] = ["ac-only", "floor-heating", "central-air"];
const SOLAR_ORIENTATIONS: SolarOrientation[] = [
  "south",
  "south-east",
  "south-west",
  "east",
  "west",
];
const RISES: ElectricityRiseScenario[] = ["flat", "moderate", "steep"];
const REGION_IDS: RegionId[] = [1, 2, 3, 4, 5, 6, 7, 8];
const AGE_BRACKETS: AgeBracket[] = [
  "before-1980",
  "1980-1999",
  "2000-2009",
  "2010-later",
];
const RENOVATION_ITEM_IDS: RenovationItemId[] = [
  "external-insulation",
  "internal-insulation",
  "ceiling-insulation",
  "floor-insulation",
  "inner-window",
  "window-replacement",
  "airtight-improvement",
];
const PREFECTURE_LIST: Prefecture[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

// ── プリミティブ sanitizer ─────────────────────────────────────────
function num(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function int(v: unknown, def: number, min: number, max: number): number {
  const n = num(v, def, min, max);
  return Math.round(n);
}

function bool(v: unknown, def: boolean): boolean {
  return typeof v === "boolean" ? v : def;
}

function pickEnum<T extends string | number>(v: unknown, allowed: readonly T[], def: T): T {
  return (allowed as readonly unknown[]).includes(v as T) ? (v as T) : def;
}

function trimStr(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

// ── renovation の sanitize ────────────────────────────────────────
function sanitizeRenovation(raw: unknown): RenovationInput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items = itemsRaw
    .filter((x): x is RenovationItemId => RENOVATION_ITEM_IDS.includes(x as RenovationItemId))
    .slice(0, RENOVATION_ITEM_IDS.length); // 最大本数で打切り
  return {
    ageBracket: pickEnum(r.ageBracket, AGE_BRACKETS, "1980-1999"),
    remainingYears: int(r.remainingYears, 20, 1, 60),
    existingUa: num(r.existingUa, 1.2, 0.1, 5.0),
    existingCValue: num(r.existingCValue, 5.0, 0.1, 15.0),
    existingWindow: pickEnum(r.existingWindow, WINDOW_SPECS, "alum-pair"),
    existingWaterHeater: pickEnum(r.existingWaterHeater, WATER_HEATERS, "gas"),
    existingHeating: pickEnum(r.existingHeating, HEATINGS, "ac-only"),
    items: Array.from(new Set(items)),
  };
}

// ── HousingInput の sanitize ──────────────────────────────────────
export function sanitizeInput(raw: unknown): HousingInput {
  const r =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const subsidyIdsRaw = Array.isArray(r.appliedSubsidyIds) ? r.appliedSubsidyIds : [];
  const appliedSubsidyIds = subsidyIdsRaw
    .map((s) => trimStr(s, 64))
    .filter((s): s is string => !!s)
    .slice(0, 32);

  const result: HousingInput = {
    mode: pickEnum(r.mode, MODES, FALLBACK.mode),
    floorArea: num(r.floorArea, FALLBACK.floorArea, 30, 500),
    region: pickEnum(r.region, REGION_IDS, FALLBACK.region),
    household: int(r.household, FALLBACK.household, 1, 10),
    presence: pickEnum(r.presence, PRESENCES, FALLBACK.presence),
    livingYears: int(r.livingYears, FALLBACK.livingYears, 1, 60),

    addressPrefecture: pickEnumOrUndef(r.addressPrefecture, PREFECTURE_LIST),
    addressCity: trimStr(r.addressCity, 64),

    insulationPreset: pickEnum(r.insulationPreset, INSULATION_PRESETS, FALLBACK.insulationPreset),
    uaValue: num(r.uaValue, FALLBACK.uaValue, 0.1, 5.0),
    cValue: num(r.cValue, FALLBACK.cValue, 0.1, 15.0),
    windowSpec: pickEnum(r.windowSpec, WINDOW_SPECS, FALLBACK.windowSpec),

    solarCapacity: num(r.solarCapacity, FALLBACK.solarCapacity, 0, 50),
    solarOrientation: pickEnum(r.solarOrientation, SOLAR_ORIENTATIONS, FALLBACK.solarOrientation),
    solarTilt: num(r.solarTilt, FALLBACK.solarTilt, 0, 90),
    batteryCapacity: num(r.batteryCapacity, FALLBACK.batteryCapacity, 0, 50),
    waterHeater: pickEnum(r.waterHeater, WATER_HEATERS, FALLBACK.waterHeater),
    heating: pickEnum(r.heating, HEATINGS, FALLBACK.heating),
    hems: bool(r.hems, FALLBACK.hems),

    electricityPriceBuy: num(r.electricityPriceBuy, FALLBACK.electricityPriceBuy, 5, 200),
    gasPrice: num(r.gasPrice, FALLBACK.gasPrice, 50, 1000),
    sellPriceFit: num(r.sellPriceFit, FALLBACK.sellPriceFit, 0, 100),
    sellPricePostFit: num(r.sellPricePostFit, FALLBACK.sellPricePostFit, 0, 100),
    electricityRise: pickEnum(r.electricityRise, RISES, FALLBACK.electricityRise),
    appliedSubsidyIds,

    renovation: sanitizeRenovation(r.renovation),
  };
  return result;
}

function pickEnumOrUndef<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return (allowed as readonly unknown[]).includes(v as T) ? (v as T) : undefined;
}

/**
 * 旧バージョンの入力を現行スキーマへ migrate。
 * 実行時バリデーションは sanitizeInput が担う。
 */
export function migrateInput(raw: Partial<HousingInput> & { schemaVersion?: number }): HousingInput {
  return sanitizeInput(raw);
}

/** envelope を作成（保存・共有用） */
export function makeEnvelope(input: HousingInput): InputEnvelope {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, input };
}

/**
 * envelope（または素の HousingInput）から HousingInput を取り出す。
 * 信用できない入力（共有URL, localStorage）はここを必ず通る。
 */
export function unwrapEnvelope(value: unknown): HousingInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if ("schemaVersion" in v && "input" in v && v.input && typeof v.input === "object") {
    return sanitizeInput(v.input);
  }
  // 素のデータ（schemaVersion 無し → v1 として扱う）
  return sanitizeInput(v);
}
