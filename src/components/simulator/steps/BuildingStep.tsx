"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHousingStore } from "@/store/housingStore";
import { REGION_LIST } from "@/lib/housing/data/regions";
import { PREFECTURE_LIST, citiesFor, lookupRegion } from "@/lib/housing/data/regionLookup";
import { Field } from "../Field";
import { StepShell } from "../StepShell";
import type { Prefecture, RegionId, SimulationMode } from "@/lib/housing/types";
import { INSULATION_PRESETS } from "@/lib/housing/data/insulationPresets";
import { cn } from "@/lib/utils";

export function BuildingStep({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const input = useHousingStore((s) => s.input);
  const updateInput = useHousingStore((s) => s.updateInput);
  const setMode = useHousingStore((s) => s.setMode);
  const setAddress = useHousingStore((s) => s.setAddress);

  const onRegionChange = (regionStr: string) => {
    const region = Number(regionStr) as RegionId;
    const preset = input.insulationPreset === "custom" ? null : INSULATION_PRESETS[input.insulationPreset];
    updateInput({
      region,
      ...(preset ? { uaValue: preset.uaByRegion[region] } : {}),
      // 手動上書き時は住所連携を解除
      addressPrefecture: undefined,
      addressCity: undefined,
    });
  };

  const onPrefectureChange = (v: string) => {
    if (v === "__none__") {
      setAddress(undefined);
      return;
    }
    setAddress(v as Prefecture);
  };

  const onCityChange = (v: string) => {
    if (!input.addressPrefecture) return;
    setAddress(input.addressPrefecture, v === "__none__" ? undefined : v);
  };

  const cityOptions = input.addressPrefecture ? citiesFor(input.addressPrefecture) : [];
  const lookupResult = input.addressPrefecture
    ? lookupRegion(input.addressPrefecture, input.addressCity)
    : null;

  return (
    <StepShell
      title="建物条件"
      description="建物の規模と地域、家族構成を入力します。"
      onBack={onBack}
      onNext={onNext}
    >
      <ModeToggle value={input.mode} onChange={setMode} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field id="addressPrefecture" label="都道府県（任意）" hint="選択すると地域区分を自動セットします。">
          <Select
            value={input.addressPrefecture ?? "__none__"}
            onValueChange={onPrefectureChange}
          >
            <SelectTrigger id="addressPrefecture">
              <SelectValue placeholder="未選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">未選択</SelectItem>
              {PREFECTURE_LIST.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="addressCity"
          label="主要市町村（任意）"
          hint={
            input.addressPrefecture
              ? cityOptions.length === 0
                ? "県内の例外市町村はありません。"
                : "県内に地域区分が異なる代表都市があります。"
              : "都道府県を先に選んでください。"
          }
        >
          <Select
            value={input.addressCity ?? "__none__"}
            onValueChange={onCityChange}
            disabled={!input.addressPrefecture || cityOptions.length === 0}
          >
            <SelectTrigger id="addressCity">
              <SelectValue placeholder="代表値を使用" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">代表値を使用</SelectItem>
              {cityOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="floorArea" label="延床面積" unit="㎡">
          <Input
            id="floorArea"
            type="number"
            min={30}
            max={500}
            value={input.floorArea}
            onChange={(e) => updateInput({ floorArea: Number(e.target.value) || 0 })}
          />
        </Field>

        <Field
          id="region"
          label="地域区分"
          hint={
            lookupResult
              ? `住所から自動判定: ${lookupResult.matched === "city" ? "市町村別" : "都道府県デフォルト"}（手動で上書き可）`
              : "省エネ基準の地域区分（1=寒冷地、8=亜熱帯）"
          }
        >
          <Select value={String(input.region)} onValueChange={onRegionChange}>
            <SelectTrigger id="region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGION_LIST.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}（{r.representative}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="household" label="家族人数" unit="人">
          <Input
            id="household"
            type="number"
            min={1}
            max={10}
            value={input.household}
            onChange={(e) => updateInput({ household: Number(e.target.value) || 1 })}
          />
        </Field>

        <Field id="presence" label="在宅時間帯">
          <Select
            value={input.presence}
            onValueChange={(v) => updateInput({ presence: v as "evening-only" | "all-day" })}
          >
            <SelectTrigger id="presence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="evening-only">朝晩のみ在宅（共働き想定）</SelectItem>
              <SelectItem value="all-day">日中も在宅</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="livingYears" label={input.mode === "renovation" ? "残り想定居住年数" : "想定居住年数"} unit="年" hint="累計コストを比較する期間。">
          <Input
            id="livingYears"
            type="number"
            min={5}
            max={50}
            value={input.livingYears}
            onChange={(e) => updateInput({ livingYears: Number(e.target.value) || 30 })}
          />
        </Field>
      </div>
    </StepShell>
  );
}

function ModeToggle({ value, onChange }: { value: SimulationMode; onChange: (m: SimulationMode) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">検討シーン</span>
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <ModeButton selected={value === "new-build"} onClick={() => onChange("new-build")} label="新築" hint="性能・設備の追加検討" />
        <ModeButton selected={value === "renovation"} onClick={() => onChange("renovation")} label="既築リフォーム" hint="現状 vs 改修後" />
      </div>
      {value === "renovation" && (
        <p className="text-xs text-muted-foreground">
          リフォームモードでは、現状の性能とリフォーム計画を別ステップで入力します。
        </p>
      )}
    </div>
  );
}

function ModeButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-left transition-colors",
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "hover:bg-muted"
      )}
      aria-pressed={selected}
    >
      <div className="font-medium text-sm">{label}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </button>
  );
}
