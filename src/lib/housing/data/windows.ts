// Representative U values (W/m²·K) and reference price ranges (per 1m² of window) for window specs.
// Source: median ranges from published manufacturer catalogs, based on JIS A 4710.

import type { WindowSpecId } from "../types";

export interface WindowSpecData {
  id: WindowSpecId;
  name: string;
  description: string;
  /** Window U value W/(m²·K) */
  uValue: number;
}

export const WINDOW_SPECS: Record<WindowSpecId, WindowSpecData> = {
  "alum-pair": {
    id: "alum-pair",
    name: "アルミ ペアガラス",
    description: "枠アルミ + 複層ガラス。最低水準の断熱。",
    uValue: 4.07,
  },
  "alum-resin-pair-lowe": {
    id: "alum-resin-pair-lowe",
    name: "アルミ樹脂複合 Low-E ペア",
    description: "樹脂とアルミの複合枠 + Low-E 複層ガラス。",
    uValue: 2.33,
  },
  "resin-pair-lowe": {
    id: "resin-pair-lowe",
    name: "樹脂サッシ Low-E ペア",
    description: "樹脂枠 + Low-E 複層ガラス。高性能住宅で一般的。",
    uValue: 1.60,
  },
  "resin-triple-lowe": {
    id: "resin-triple-lowe",
    name: "樹脂サッシ Low-E トリプル",
    description: "樹脂枠 + Low-E トリプルガラス。寒冷地・超高性能。",
    uValue: 0.90,
  },
};
