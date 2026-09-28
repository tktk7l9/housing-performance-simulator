"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHousingStore } from "@/store/housingStore";
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

const ACTION_CLASS =
  "h-auto min-h-11 whitespace-normal px-2 text-xs leading-tight sm:h-10 sm:min-h-0 sm:whitespace-nowrap sm:px-4 sm:text-sm";

export function ResultsStep({ onBack }: { onBack: () => void }) {
  const result = useHousingStore((s) => s.result);
  const input = useHousingStore((s) => s.input);
  const calculate = useHousingStore((s) => s.calculate);
  const calculateFailed = useHousingStore((s) => s.calculateFailed);
  const [saveOpen, setSaveOpen] = useState(false);

  // SHIG 29: calculating is the only possible action here, so do it automatically
  // (after a reload, a sidebar jump, or any input change that cleared the result).
  useEffect(() => {
    if (!result) calculate();
  }, [result, calculate]);

  if (!result && calculateFailed) {
    // SHIG 55: say what went wrong and what to do next instead of spinning forever
    return (
      <section className="flex w-full flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">シミュレーション結果</h2>
        <p role="alert" className="text-sm text-destructive">
          計算できませんでした。入力値を見直してから、もう一度お試しください。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={calculate}>もう一度計算する</Button>
          <Button variant="outline" onClick={onBack}>
            入力に戻る
          </Button>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="flex w-full flex-col gap-6" aria-busy="true">
        <h2 className="text-2xl font-semibold tracking-tight">シミュレーション結果</h2>
        <p className="text-sm text-muted-foreground">計算しています…</p>
      </section>
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
        {/* SHIG 67: secondary actions stay on one row on phones so the answer is not pushed down */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={() => setSaveOpen(true)} className={ACTION_CLASS}>
            <Save className="h-4 w-4" /> 保存
          </Button>
          <ShareUrlButton input={input} className={ACTION_CLASS} />
          <PdfExportButton output={result} className={ACTION_CLASS} />
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

      <div className="grid grid-cols-1 gap-6">
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

      </div>

      {/* SHIG 85: the cost table gets the full width instead of half a column */}
      <Card>
        <CardHeader>
          <CardTitle>初期費用の内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <InitialCostBreakdown output={result} />
        </CardContent>
      </Card>

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
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:underline"
        >
          ← 入力を変更する
        </button>
      </div>
    </section>
  );
}
