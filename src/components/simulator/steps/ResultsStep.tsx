"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHousingStore } from "@/store/housingStore";
import { StepShell } from "../StepShell";
import { ScenarioComparison } from "../results/ScenarioComparison";
import { CumulativeCostChart } from "../results/CumulativeCostChart";
import { AnnualCostBreakdown } from "../results/AnnualCostBreakdown";
import { InitialCostBreakdown } from "../results/InitialCostBreakdown";
import { AssumptionsPanel } from "../results/AssumptionsPanel";
import { ShareUrlButton } from "../results/ShareUrlButton";
import { PdfExportButton } from "../results/PdfExportButton";
import { SaveDialog } from "../SaveDialog";
import { SensitivityChart } from "../results/SensitivityChart";
import { EvaluationCard } from "../results/EvaluationCard";

export function ResultsStep({ onBack }: { onBack: () => void }) {
  const result = useHousingStore((s) => s.result);
  const input = useHousingStore((s) => s.input);
  const calculate = useHousingStore((s) => s.calculate);
  const [saveOpen, setSaveOpen] = useState(false);

  if (!result) {
    return (
      <StepShell
        title="結果"
        description="まだ計算されていません。前のステップで「計算する」を押してください。"
        onBack={onBack}
        onNext={calculate}
        nextLabel="今すぐ計算する"
      >
        <div />
      </StepShell>
    );
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">シミュレーション結果</h2>
          <p className="text-sm text-muted-foreground">
            {input.livingYears}年間の累計コストでシナリオを比較。
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            <Save className="h-4 w-4" /> 保存
          </Button>
          <ShareUrlButton input={input} />
          <PdfExportButton output={result} />
        </div>
      </header>

      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} />

      <EvaluationCard output={result} />

      <ScenarioComparison output={result} />

      <Card>
        <CardHeader>
          <CardTitle>累計コスト推移（{input.livingYears}年）</CardTitle>
        </CardHeader>
        <CardContent>
          <CumulativeCostChart scenarios={result.scenarios} livingYears={input.livingYears} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1年目の光熱費内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <AnnualCostBreakdown
              scenarios={result.scenarios}
              electricityPrice={input.electricityPriceBuy}
              gasPrice={input.gasPrice}
              sellPriceFit={input.sellPriceFit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>初期費用の内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <InitialCostBreakdown output={result} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>感度分析（どのパラメータが効くか）</CardTitle>
        </CardHeader>
        <CardContent>
          <SensitivityChart input={input} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>計算根拠</CardTitle>
        </CardHeader>
        <CardContent>
          <AssumptionsPanel output={result} />
        </CardContent>
      </Card>

      <div className="flex pt-4 border-t">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 入力を変更する
        </button>
      </div>
    </section>
  );
}
