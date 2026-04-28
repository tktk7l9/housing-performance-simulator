"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { SimulationOutput } from "@/lib/housing/types";
import { REGIONS } from "@/lib/housing/data/regions";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  h2: { fontSize: 12, fontWeight: 700, marginBottom: 6, borderBottom: "1pt solid #ccc", paddingBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  scenarioCard: { border: "1pt solid #ddd", padding: 8, marginBottom: 6, borderRadius: 4 },
  scenarioName: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  caveat: { fontSize: 8, color: "#777", marginTop: 12, lineHeight: 1.6 },
});

export function ResultPdfDocument({ output }: { output: SimulationOutput }) {
  const region = REGIONS[output.inputAtCalc.region];
  const baseline = output.scenarios.find((s) => s.scenarioId === output.baselineId)!;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>住宅性能シミュレーション 結果サマリ</Text>
        <Text style={styles.subtitle}>
          {region.name}（{region.representative}） / 床面積 {output.inputAtCalc.floorArea}m² / {output.inputAtCalc.household}人 /
          評価期間 {output.inputAtCalc.livingYears}年
        </Text>

        <View style={styles.section}>
          <Text style={styles.h2}>シナリオ比較</Text>
          {output.scenarios.map((s) => {
            const cumDelta = s.cumulativeTotal - baseline.cumulativeTotal;
            const payback = output.paybackYears[s.scenarioId];
            return (
              <View key={s.scenarioId} style={styles.scenarioCard}>
                <Text style={styles.scenarioName}>{s.scenarioName}</Text>
                <View style={styles.row}>
                  <Text>初期費用（補助後）</Text>
                  <Text>{formatY(s.initialCostNet)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>1年目 光熱費</Text>
                  <Text>{formatY(s.firstYearEnergyCost)}</Text>
                </View>
                <View style={styles.row}>
                  <Text>{output.inputAtCalc.livingYears}年累計</Text>
                  <Text>{formatY(s.cumulativeTotal)}</Text>
                </View>
                {s.scenarioId !== output.baselineId && (
                  <View style={styles.row}>
                    <Text>基準比 累計差</Text>
                    <Text>{(cumDelta >= 0 ? "+" : "") + formatY(cumDelta)}</Text>
                  </View>
                )}
                {s.scenarioId !== output.baselineId && (
                  <View style={styles.row}>
                    <Text>投資回収年数</Text>
                    <Text>{Number.isFinite(payback) ? `${payback.toFixed(1)} 年` : "期間内回収なし"}</Text>
                  </View>
                )}
                {s.scenarioId !== output.baselineId && (
                  <View style={styles.row}>
                    <Text>CO2 削減 年間</Text>
                    <Text>{Math.round(s.annualCo2Reduction).toLocaleString()} kg</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>計算の前提</Text>
          <View style={styles.row}>
            <Text>電気代上昇率</Text>
            <Text>年 {output.assumptions.electricityRisePercent}%</Text>
          </View>
          <View style={styles.row}>
            <Text>CO2 係数（電力）</Text>
            <Text>{output.assumptions.co2EmissionFactorElectricity} kg-CO2/kWh</Text>
          </View>
          <View style={styles.row}>
            <Text>太陽光 損失係数</Text>
            <Text>{output.assumptions.solarLossFactor}</Text>
          </View>
          <View style={styles.row}>
            <Text>FIT 期間</Text>
            <Text>{output.assumptions.fitYears} 年</Text>
          </View>
        </View>

        <Text style={styles.caveat}>
          ※ 本ツールは特定のメーカー・商品を推奨しません。実際の光熱費は気象・生活パターン・実機効率により変動します。
          太陽光パワコン・蓄電池の交換費用は試算に未計上です。本試算は意思決定の比較材料としてご利用ください。
        </Text>
      </Page>
    </Document>
  );
}

function formatY(v: number): string {
  return `${Math.round(v).toLocaleString()} 円`;
}
