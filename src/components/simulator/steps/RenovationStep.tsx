"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousingStore } from "@/store/housingStore";
import { Field } from "../Field";
import { StepShell } from "../StepShell";
import { AGE_PRESETS, uaForAge } from "@/lib/housing/data/agePresets";
import { RENOVATION_ITEMS, estimateOpenings } from "@/lib/housing/data/renovationCosts";
import { WINDOW_SPECS } from "@/lib/housing/data/windows";
import { WATER_HEATERS, HEATING_OPTIONS } from "@/lib/housing/data/equipment";
import { defaultRenovationInput } from "@/lib/housing/presets";
import type {
  AgeBracket,
  HeatingId,
  RenovationInput,
  RenovationItemId,
  WaterHeaterId,
  WindowSpecId,
} from "@/lib/housing/types";
import { formatManYen } from "@/lib/utils";

export function RenovationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const input = useHousingStore((s) => s.input);
  const updateInput = useHousingStore((s) => s.updateInput);

  // 初回アクセス時に renovation を初期化
  const r: RenovationInput = input.renovation ?? defaultRenovationInput(input);
  const setR = (patch: Partial<RenovationInput>) => {
    updateInput({ renovation: { ...r, ...patch } });
  };

  const onAgeChange = (id: AgeBracket) => {
    const ua = uaForAge(id, input.region);
    setR({
      ageBracket: id,
      existingUa: ua,
      existingCValue: AGE_PRESETS[id].cValue,
      existingWindow: AGE_PRESETS[id].window,
    });
  };

  const toggleItem = (id: RenovationItemId) => {
    const next = r.items.includes(id) ? r.items.filter((x) => x !== id) : [...r.items, id];
    setR({ items: next });
  };

  const openings = estimateOpenings(input.floorArea);

  // 概算合計
  let total = 0;
  for (const id of r.items) {
    const item = RENOVATION_ITEMS[id];
    if (item.unit === "perFloorAreaM2") total += item.unitCost * input.floorArea;
    else if (item.unit === "perOpening") total += item.unitCost * openings;
    else total += item.unitCost;
  }

  return (
    <StepShell
      title="現状とリフォーム計画"
      description="現状の住宅性能と実施するリフォーム項目を選びます。"
      onBack={onBack}
      onNext={onNext}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id="ageBracket" label="築年代" hint={AGE_PRESETS[r.ageBracket].description}>
          <Select value={r.ageBracket} onValueChange={(v) => onAgeChange(v as AgeBracket)}>
            <SelectTrigger id="ageBracket">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AGE_PRESETS).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="existingUa" label="現状 UA 値" unit="W/(m²·K)" hint="築年代から自動推定。手動上書き可。">
          <Input
            id="existingUa"
            type="number"
            step={0.01}
            min={0.1}
            max={3.5}
            value={r.existingUa}
            onChange={(e) => setR({ existingUa: Number(e.target.value) || 0 })}
          />
        </Field>

        <Field id="existingC" label="現状 C 値" unit="cm²/m²">
          <Input
            id="existingC"
            type="number"
            step={0.1}
            min={0.1}
            max={15}
            value={r.existingCValue}
            onChange={(e) => setR({ existingCValue: Number(e.target.value) || 0 })}
          />
        </Field>

        <Field id="existingWindow" label="現状の窓仕様">
          <Select value={r.existingWindow} onValueChange={(v) => setR({ existingWindow: v as WindowSpecId })}>
            <SelectTrigger id="existingWindow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WINDOW_SPECS).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="existingWater" label="現状の給湯機器">
          <Select value={r.existingWaterHeater} onValueChange={(v) => setR({ existingWaterHeater: v as WaterHeaterId })}>
            <SelectTrigger id="existingWater">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WATER_HEATERS).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="existingHeating" label="現状の暖冷房">
          <Select value={r.existingHeating} onValueChange={(v) => setR({ existingHeating: v as HeatingId })}>
            <SelectTrigger id="existingHeating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HEATING_OPTIONS).map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="実施するリフォーム項目"
        hint={`概算合計: ${formatManYen(total)}（窓 ${openings} 箇所換算）`}
      >
        <div className="flex flex-col gap-2">
          {Object.values(RENOVATION_ITEMS).map((item) => {
            const checked = r.items.includes(item.id);
            const cost =
              item.unit === "perFloorAreaM2"
                ? item.unitCost * input.floorArea
                : item.unit === "perOpening"
                ? item.unitCost * openings
                : item.unitCost;
            return (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox checked={checked} onChange={() => toggleItem(item.id)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="font-mono text-sm whitespace-nowrap">{formatManYen(cost)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    単価: {item.unitCost.toLocaleString()} {item.unitLabel}
                    ・UA−{item.uaReduction.toFixed(2)} / C−{item.cReduction.toFixed(1)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </Field>
    </StepShell>
  );
}
