"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/lib/housing/types";

interface Props {
  scenarios: ScenarioResult[];
  electricityPrice: number;
  gasPrice: number;
  sellPriceFit: number;
}

export function AnnualCostBreakdown({ scenarios, electricityPrice, gasPrice, sellPriceFit }: Props) {
  const data = scenarios.map((s) => {
    const heating = s.annualHeatingKwh * electricityPrice;
    const hotWater = s.annualHotWaterKwh * electricityPrice + s.annualHotWaterGas * gasPrice;
    const other = s.annualOtherKwh * electricityPrice;
    const sell = -s.firstYearSellRevenue;
    void sellPriceFit; // 売電は firstYearSellRevenue を直接利用
    return {
      name: s.scenarioName,
      暖冷房: Math.round(heating / 1000),
      給湯: Math.round(hotWater / 1000),
      その他家電: Math.round(other / 1000),
      売電収入: Math.round(sell / 1000),
    };
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 220)" />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={(v) => `${v}`} fontSize={11} label={{ value: "千円/年", position: "insideTopLeft", fontSize: 11 }} />
          <Tooltip formatter={(v) => `${Number(v).toLocaleString()} 千円`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="暖冷房" stackId="a" fill="var(--chart-3)" />
          <Bar dataKey="給湯" stackId="a" fill="var(--chart-4)" />
          <Bar dataKey="その他家電" stackId="a" fill="var(--chart-5)" />
          <Bar dataKey="売電収入" stackId="a" fill="var(--chart-2)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
