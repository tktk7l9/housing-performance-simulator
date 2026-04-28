"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousingStore } from "@/store/housingStore";
import { matchSubsidies } from "@/lib/housing/subsidy";
import { Field } from "../Field";
import { StepShell } from "../StepShell";
import type { ElectricityRiseScenario } from "@/lib/housing/types";

export function EconomyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const input = useHousingStore((s) => s.input);
  const updateInput = useHousingStore((s) => s.updateInput);
  const matched = matchSubsidies(input);

  const toggleSubsidy = (id: string) => {
    const next = input.appliedSubsidyIds.includes(id)
      ? input.appliedSubsidyIds.filter((x) => x !== id)
      : [...input.appliedSubsidyIds, id];
    updateInput({ appliedSubsidyIds: next });
  };

  return (
    <StepShell title="経済条件" description="光熱費の単価・上昇シナリオ・補助金を設定します。" onBack={onBack} onNext={onNext}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id="electricityPriceBuy" label="電気料金 単価" unit="円/kWh">
          <Input
            id="electricityPriceBuy"
            type="number"
            min={10}
            max={80}
            value={input.electricityPriceBuy}
            onChange={(e) => updateInput({ electricityPriceBuy: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field id="gasPrice" label="ガス料金" unit="円/m³">
          <Input
            id="gasPrice"
            type="number"
            min={50}
            max={500}
            value={input.gasPrice}
            onChange={(e) => updateInput({ gasPrice: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field id="sellPriceFit" label="FIT 売電単価" unit="円/kWh" hint="設置から10年間">
          <Input
            id="sellPriceFit"
            type="number"
            value={input.sellPriceFit}
            onChange={(e) => updateInput({ sellPriceFit: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field id="sellPricePostFit" label="卒FIT 売電単価" unit="円/kWh" hint="11年目以降">
          <Input
            id="sellPricePostFit"
            type="number"
            value={input.sellPricePostFit}
            onChange={(e) => updateInput({ sellPricePostFit: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <Field id="electricityRise" label="電気代 上昇シナリオ">
        <Select
          value={input.electricityRise}
          onValueChange={(v) => updateInput({ electricityRise: v as ElectricityRiseScenario })}
        >
          <SelectTrigger id="electricityRise">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">横ばい（年 0%）</SelectItem>
            <SelectItem value="moderate">緩やかな上昇（年 +2%）</SelectItem>
            <SelectItem value="steep">急騰（年 +5%）</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="適用する補助金"
        hint="入力された性能・設備で受給可能性のある補助金です。実際の受給可否は公募要領で確認してください。"
      >
        <div className="flex flex-col gap-2">
          {matched.length === 0 && (
            <div className="text-sm text-muted-foreground">
              現在の仕様で自動マッチした補助金はありません。
            </div>
          )}
          {matched.map((s) => (
            <label key={s.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={input.appliedSubsidyIds.includes(s.id)}
                onChange={() => toggleSubsidy(s.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="font-mono text-sm">{s.amount.toLocaleString()}円</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-1">
                  更新: {s.lastUpdated} / 出典: {s.source}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Field>
    </StepShell>
  );
}
