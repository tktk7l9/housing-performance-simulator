// 地域別 年間日射量（kWh/m²/年・水平面）の概算値
// 出典: NEDO 日射量データベース MONSOLA-20 の各地域代表都市から概算。
// 方位・傾斜補正は別途 solar.ts の係数表で扱う。

import type { RegionId, SolarOrientation } from "../types";

/** 地域別 年間日射量（kWh/m²） — 太陽光最適傾斜・南面換算前の水平面相当の概算 */
export const ANNUAL_HORIZONTAL_IRRADIANCE: Record<RegionId, number> = {
  1: 1180,
  2: 1240,
  3: 1280,
  4: 1320,
  5: 1340,
  6: 1380,
  7: 1420,
  8: 1500,
};

/** 方位補正係数（南=1.0 基準） */
export const ORIENTATION_FACTOR: Record<SolarOrientation, number> = {
  south: 1.0,
  "south-east": 0.96,
  "south-west": 0.96,
  east: 0.86,
  west: 0.86,
};

/**
 * 傾斜角補正係数 — 0°（水平）から最適傾斜（≈30°）までで微増し、
 * 過大傾斜では微減する単純モデル。
 */
export function tiltFactor(tiltDeg: number): number {
  // 30度近辺で 1.10、水平で 1.00、垂直で 0.70 程度の連続関数
  const t = Math.max(0, Math.min(90, tiltDeg));
  if (t <= 30) return 1.0 + (t / 30) * 0.10;
  // 30→90で 1.10 → 0.70 に線形低下
  return 1.10 - ((t - 30) / 60) * 0.40;
}

/** 太陽光の総合損失係数（パワコン・配線・温度・汚れ） */
export const SOLAR_LOSS_FACTOR = 0.85;
