"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/lib/housing/types";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CumulativeCostChart({ scenarios, livingYears }: { scenarios: ScenarioResult[]; livingYears: number }) {
  const data = Array.from({ length: livingYears }, (_, i) => {
    const row: Record<string, number> = { year: i + 1 };
    for (const s of scenarios) {
      row[s.scenarioName] = Math.round((s.yearly[i]?.cumulative ?? 0) / 10000); // 万円
    }
    return row;
  });

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 220)" />
          <XAxis dataKey="year" tickFormatter={(v) => `${v}年目`} fontSize={11} />
          <YAxis tickFormatter={(v) => `${v}`} fontSize={11} label={{ value: "万円", position: "insideTopLeft", fontSize: 11 }} />
          <Tooltip
            formatter={(v) => `${Number(v).toLocaleString()}万円`}
            labelFormatter={(l) => `${l}年目`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {scenarios.map((s, i) => (
            <Line
              key={s.scenarioId}
              type="monotone"
              dataKey={s.scenarioName}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
