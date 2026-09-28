"use client";

import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useHousingStore } from "@/store/housingStore";
import { WATER_HEATERS, HEATING_OPTIONS } from "@/lib/housing/data/equipment";
import { Field } from "../Field";
import { StepShell } from "../StepShell";
import type { HeatingId, SolarOrientation, WaterHeaterId } from "@/lib/housing/types";

export function EquipmentStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const input = useHousingStore((s) => s.input);
  const updateInput = useHousingStore((s) => s.updateInput);

  return (
    <StepShell title="設備" description="太陽光・蓄電池・給湯・暖冷房・HEMS の有無を選択します。" onBack={onBack} onNext={onNext}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id="solarCapacity" label="太陽光発電 容量" unit="kW">
          <NumberInput
            id="solarCapacity"
            min={0}
            max={20}
            value={input.solarCapacity}
            unit="kW"
            onValueChange={(n) => updateInput({ solarCapacity: n })}
          />
        </Field>
        <Field id="batteryCapacity" label="蓄電池 容量" unit="kWh">
          <NumberInput
            id="batteryCapacity"
            min={0}
            max={30}
            value={input.batteryCapacity}
            unit="kWh"
            onValueChange={(n) => updateInput({ batteryCapacity: n })}
          />
        </Field>
        <Field id="solarOrientation" label="太陽光 方位">
          <Select
            value={input.solarOrientation}
            onValueChange={(v) => updateInput({ solarOrientation: v as SolarOrientation })}
          >
            <SelectTrigger id="solarOrientation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="south">南</SelectItem>
              <SelectItem value="south-east">南東</SelectItem>
              <SelectItem value="south-west">南西</SelectItem>
              <SelectItem value="east">東</SelectItem>
              <SelectItem value="west">西</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="solarTilt" label="太陽光 傾斜角" unit="°" hint="一般的な切妻屋根: 25〜30°">
          <NumberInput
            id="solarTilt"
            min={0}
            max={90}
            value={input.solarTilt}
            unit="°"
            onValueChange={(n) => updateInput({ solarTilt: n })}
          />
        </Field>

        <Field id="waterHeater" label="給湯機器">
          <Select value={input.waterHeater} onValueChange={(v) => updateInput({ waterHeater: v as WaterHeaterId })}>
            <SelectTrigger id="waterHeater">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WATER_HEATERS).map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="heating" label="暖冷房">
          <Select value={input.heating} onValueChange={(v) => updateInput({ heating: v as HeatingId })}>
            <SelectTrigger id="heating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HEATING_OPTIONS).map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field id="hems" label="HEMS（エネルギー管理システム）" hint="自家消費率を約 5% 改善する想定。">
        <div className="flex items-center gap-3">
          <ToggleSwitch id="hems" checked={input.hems} onCheckedChange={(v) => updateInput({ hems: v })} />
          <span className="text-sm text-muted-foreground">{input.hems ? "あり" : "なし"}</span>
        </div>
      </Field>
    </StepShell>
  );
}
