"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { SimulationOutput } from "@/lib/housing/types";
import { REGIONS } from "@/lib/housing/data/regions";
import { ANNUAL_HORIZONTAL_IRRADIANCE } from "@/lib/housing/data/solarIrradiance";
import { WATER_HEATERS, HEATING_OPTIONS, SOLAR_COST_PER_KW, BATTERY_COST_PER_KWH } from "@/lib/housing/data/equipment";

export function AssumptionsPanel({ output }: { output: SimulationOutput }) {
  const a = output.assumptions;
  const region = REGIONS[output.inputAtCalc.region];
  const wh = WATER_HEATERS[output.inputAtCalc.waterHeater];
  const heat = HEATING_OPTIONS[output.inputAtCalc.heating];

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="general">
        <AccordionTrigger>計算の前提（一般）</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>居住年数: <span className="font-mono">{output.inputAtCalc.livingYears} 年</span></li>
            <li>電気代上昇率: <span className="font-mono">年 {a.electricityRisePercent}%</span></li>
            <li>FIT 期間: <span className="font-mono">{a.fitYears} 年</span></li>
            <li>太陽光 損失係数: <span className="font-mono">{a.solarLossFactor}</span></li>
            <li>その他家電: <span className="font-mono">{a.otherKwhPerPersonYear} kWh/人/年</span></li>
            <li>CO2 係数 電力: <span className="font-mono">{a.co2EmissionFactorElectricity} kg-CO2/kWh</span></li>
            <li>CO2 係数 ガス: <span className="font-mono">{a.co2EmissionFactorGas} kg-CO2/m³</span></li>
            <li>太陽光 単価: <span className="font-mono">{SOLAR_COST_PER_KW.toLocaleString()} 円/kW</span></li>
            <li>蓄電池 単価: <span className="font-mono">{BATTERY_COST_PER_KWH.toLocaleString()} 円/kWh</span></li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="region">
        <AccordionTrigger>地域・気象データ</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>地域区分: <span className="font-mono">{region.name}（{region.representative}）</span></li>
            <li>暖房デグリーデー (HDD18): <span className="font-mono">{region.hdd18} ℃·日</span></li>
            <li>冷房デグリーデー (CDD24): <span className="font-mono">{region.cdd24} ℃·日</span></li>
            <li>水平面年間日射量: <span className="font-mono">{ANNUAL_HORIZONTAL_IRRADIANCE[output.inputAtCalc.region]} kWh/m²</span></li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="equipment">
        <AccordionTrigger>機器効率</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>給湯: <span className="font-mono">{wh.name}（効率 {wh.efficiency}）</span></li>
            <li>暖冷房: <span className="font-mono">{heat.name}（COP暖 {heat.copHeating} / 冷 {heat.copCooling}）</span></li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="caveats">
        <AccordionTrigger>注意点・未計上項目</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>本ツールは特定メーカー・商品を推奨しません。機器カテゴリと公開効率値のみで試算しています。</li>
            <li>太陽光のパワコン交換（10〜15年目）、蓄電池交換は本MVPでは未計上です。実比較ではこれらを差し引いてご判断ください。</li>
            <li>実際の光熱費は気象・生活パターン・実機効率で大きく変動します。本試算は意思決定の比較材料です。</li>
            <li>補助金は年度ごとに改訂されます。表示は MVP のサンプル値で、最新の公募要領で確認してください。</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
