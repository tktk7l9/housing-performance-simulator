"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runSensitivity } from "@/lib/housing/sensitivity";
import type { HousingInput } from "@/lib/housing/types";

const COLOR_GOOD = "var(--chart-2)"; // 累計が下がる方向 = 得
const COLOR_BAD = "var(--chart-5)"; // 累計が上がる方向 = 損

export function SensitivityChart({ input }: { input: HousingInput }) {
  const rows = useMemo(() => runSensitivity(input), [input]);

  // 棒1本につき2セグメント (low / high) を中心ゼロから両側に表示するための整形
  const data = rows.map((r) => ({
    label: r.label,
    centerLabel: r.centerLabel,
    lowLabel: r.lowLabel,
    highLabel: r.highLabel,
    // 万円換算で表示
    lowDelta: Math.round(r.lowDelta / 10000),
    highDelta: Math.round(r.highDelta / 10000),
    impact: Math.round(r.impact / 10000),
  }));

  const maxAbs = Math.max(
    1,
    ...data.flatMap((d) => [Math.abs(d.lowDelta), Math.abs(d.highDelta)])
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        基準（あなたの仕様）からの 30 年累計コスト変化（万円）。左に伸びる = 安くなる方向、右 = 高くなる方向。影響度の大きい順にソート。
      </p>
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 24, bottom: 10, left: 100 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.013 245)" />
            <XAxis
              type="number"
              domain={[-maxAbs, maxAbs]}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
              fontSize={11}
            />
            <YAxis type="category" dataKey="label" width={96} fontSize={11} />
            <ReferenceLine x={0} stroke="oklch(0.50 0.16 250)" strokeWidth={1.5} />
            <Tooltip
              cursor={{ fill: "oklch(0.96 0.012 245)" }}
              formatter={(v, name, item) => {
                const sign = (v as number) >= 0 ? "+" : "";
                const label = name === "lowDelta" ? item?.payload?.lowLabel : item?.payload?.highLabel;
                return [`${sign}${(v as number).toLocaleString()} 万円`, label];
              }}
              labelFormatter={(l, p) => {
                const center = p?.[0]?.payload?.centerLabel as string | undefined;
                return center ? `${l}（中心: ${center}）` : l;
              }}
            />
            <Bar dataKey="lowDelta">
              {data.map((d, i) => (
                <Cell key={`l-${i}`} fill={d.lowDelta < 0 ? COLOR_GOOD : COLOR_BAD} />
              ))}
            </Bar>
            <Bar dataKey="highDelta">
              {data.map((d, i) => (
                <Cell key={`h-${i}`} fill={d.highDelta < 0 ? COLOR_GOOD : COLOR_BAD} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
