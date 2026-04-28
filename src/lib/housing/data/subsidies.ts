// 補助金マスタ（代表例のみ。実運用では `lastUpdated` を必ず更新する）。
// 注意: 制度は年度ごとに改訂される。本データは MVP のサンプル値で、最新公募要領で確認すること。

import type { SubsidyMaster } from "../types";

export const SUBSIDIES: SubsidyMaster[] = [
  {
    id: "zeh",
    name: "ZEH支援事業",
    amount: 550_000,
    description: "ZEH基準を満たす新築（一定の太陽光・断熱要件）",
    requiredInsulation: "zeh",
    requiresSolar: true,
    regionScope: "national",
    lastUpdated: "2026-04-01",
    source: "環境省・経産省 ZEH 関連事業（年度版）",
  },
  {
    id: "kodomo-eco",
    name: "子育てグリーン住宅支援事業",
    amount: 800_000,
    description: "高断熱（GX志向 等）住宅の新築 — 子育て世帯対象",
    requiredInsulation: "heat20-g1",
    regionScope: "national",
    lastUpdated: "2026-04-01",
    source: "国交省・子育てグリーン住宅支援事業",
  },
  {
    id: "long-life",
    name: "長期優良住宅化リフォーム / 新築加算",
    amount: 1_000_000,
    description: "長期優良住宅認定 + 高断熱化",
    requiredInsulation: "heat20-g2",
    regionScope: "national",
    lastUpdated: "2026-04-01",
    source: "国交省 長期優良住宅関連支援",
  },
  {
    id: "battery-doe",
    name: "家庭用蓄電池 導入支援（DR対応）",
    amount: 200_000,
    description: "DR対応蓄電池の導入（容量3kWh以上目安）",
    regionScope: "national",
    lastUpdated: "2026-04-01",
    source: "経産省・SII 関連事業",
  },
];
