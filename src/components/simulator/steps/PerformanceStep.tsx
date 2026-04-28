"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHousingStore } from "@/store/housingStore";
import { INSULATION_PRESETS } from "@/lib/housing/data/insulationPresets";
import { WINDOW_SPECS } from "@/lib/housing/data/windows";
import { Field } from "../Field";
import { StepShell } from "../StepShell";
import type { InsulationPresetId, WindowSpecId } from "@/lib/housing/types";

export function PerformanceStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const input = useHousingStore((s) => s.input);
  const updateInput = useHousingStore((s) => s.updateInput);

  const onPresetChange = (presetId: InsulationPresetId) => {
    if (presetId === "custom") {
      updateInput({ insulationPreset: presetId });
      return;
    }
    const p = INSULATION_PRESETS[presetId];
    updateInput({
      insulationPreset: presetId,
      uaValue: p.uaByRegion[input.region],
      cValue: p.cValue,
    });
  };

  return (
    <StepShell
      title="住宅性能"
      description="断熱グレードを選ぶと UA・C 値が自動でセットされます。手動で微調整も可能です。"
      onBack={onBack}
      onNext={onNext}
    >
      <Field
        id="insulationPreset"
        label="断熱プリセット"
        hint={INSULATION_PRESETS[input.insulationPreset === "custom" ? "energy-saving" : input.insulationPreset]?.description}
      >
        <Select value={input.insulationPreset} onValueChange={(v) => onPresetChange(v as InsulationPresetId)}>
          <SelectTrigger id="insulationPreset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="energy-saving">省エネ基準</SelectItem>
            <SelectItem value="zeh">ZEH 基準</SelectItem>
            <SelectItem value="heat20-g1">HEAT20 G1</SelectItem>
            <SelectItem value="heat20-g2">HEAT20 G2</SelectItem>
            <SelectItem value="heat20-g3">HEAT20 G3</SelectItem>
            <SelectItem value="custom">カスタム（自由入力）</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id="uaValue" label="UA 値" unit="W/(m²·K)" hint="外皮平均熱貫流率。小さいほど断熱が良い。">
          <Input
            id="uaValue"
            type="number"
            step={0.01}
            min={0.1}
            max={3.5}
            value={input.uaValue}
            onChange={(e) => updateInput({ uaValue: Number(e.target.value) || 0, insulationPreset: "custom" })}
          />
        </Field>
        <Field id="cValue" label="C 値" unit="cm²/m²" hint="相当隙間面積。小さいほど気密が良い。">
          <Input
            id="cValue"
            type="number"
            step={0.1}
            min={0.1}
            max={10}
            value={input.cValue}
            onChange={(e) => updateInput({ cValue: Number(e.target.value) || 0, insulationPreset: "custom" })}
          />
        </Field>
      </div>

      <Field id="windowSpec" label="窓仕様">
        <Select value={input.windowSpec} onValueChange={(v) => updateInput({ windowSpec: v as WindowSpecId })}>
          <SelectTrigger id="windowSpec">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(WINDOW_SPECS).map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}（U={w.uValue}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </StepShell>
  );
}
