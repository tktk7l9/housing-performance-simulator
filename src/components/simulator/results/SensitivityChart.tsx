"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runSensitivity } from "@/lib/housing/sensitivity";
import type { HousingInput } from "@/lib/housing/types";
import { WrappedTick, signedManYen } from "./chartLabels";

const COLOR_GOOD = "var(--chart-2)"; // Direction where the cumulative total goes down = gain
const COLOR_BAD = "var(--chart-5)"; // Direction where the cumulative total goes up = loss

export function SensitivityChart({ input }: { input: HousingInput }) {
  const rows = useMemo(() => runSensitivity(input), [input]);

  // Shape the data to show two segments (low / high) per bar on both sides of a zero center
  const data = rows.map((r) => ({
    label: r.label,
    centerLabel: r.centerLabel,
    lowLabel: r.lowLabel,
    highLabel: r.highLabel,
    // Display in units of 10,000 yen (万円)
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
        基準（あなたの仕様）からの {input.livingYears} 年累計コスト変化（万円）。左に伸びる = 安くなる方向、右 = 高くなる方向。影響度の大きい順にソート。
      </p>
      <figure className="h-[320px] w-full">
        <figcaption className="sr-only">
          {data.map((d) => `${d.label}: ${signedManYen(d.lowDelta)}〜${signedManYen(d.highDelta)}`).join("、")}
        </figcaption>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 40, bottom: 10, left: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.013 245)" />
            <XAxis
              type="number"
              domain={[-maxAbs, maxAbs]}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
              fontSize={11}
            />
            <YAxis type="category" dataKey="label" width={76} interval={0} tick={<WrappedTick maxChars={6} anchor="end" />} />
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
              {/* SHIG 96: signed values in text so the direction does not rely on colour */}
              <LabelList dataKey="lowDelta" position="left" fontSize={10} formatter={(v) => signedManYen(Number(v))} />
            </Bar>
            <Bar dataKey="highDelta">
              {data.map((d, i) => (
                <Cell key={`h-${i}`} fill={d.highDelta < 0 ? COLOR_GOOD : COLOR_BAD} />
              ))}
              <LabelList dataKey="highDelta" position="right" fontSize={10} formatter={(v) => signedManYen(Number(v))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </div>
  );
}
