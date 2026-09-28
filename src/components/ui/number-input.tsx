"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Numeric text field that is lenient while typing (SHIG 50 / 15 / 55 / 43):
 * - keeps a text draft, so the field can be cleared and retyped without jumping to 0
 * - accepts full-width digits, full-width minus/period and thousands separators
 * - commits only valid in-range numbers while typing; on blur it clamps to [min, max]
 *   and explains what happened next to the field
 */

const FULL_WIDTH_DIGITS = /[０-９]/g;

export function normalizeNumeric(raw: string): string {
  return raw
    .replace(FULL_WIDTH_DIGITS, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".")
    .replace(/[－ー−‐]/g, "-")
    .replace(/[,，\s]/g, "");
}

/** Parses lenient numeric text; returns null when it is empty or not a number. */
export function parseNumeric(raw: string): number | null {
  const text = normalizeNumeric(raw);
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

type NativeProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "min" | "max">;

export interface NumberInputProps extends NativeProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Unit shown in the out-of-range message, e.g. "㎡" */
  unit?: string;
  /** Round to whole numbers (people, years) */
  integer?: boolean;
}

export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  unit = "",
  integer = false,
  className,
  onFocus,
  onBlur,
  id,
  ...rest
}: NumberInputProps) {
  const [draft, setDraft] = React.useState(String(value));
  const [message, setMessage] = React.useState<string | null>(null);
  const focused = React.useRef(false);
  const messageId = React.useId();

  // Follow external changes (presets, restore, undo) while the user is not editing
  React.useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const round = (n: number) => (integer ? Math.round(n) : n);
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    const n = parseNumeric(raw);
    if (n !== null && inRange(round(n))) {
      setMessage(null);
      onValueChange(round(n));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    focused.current = false;
    const n = parseNumeric(draft);
    if (n === null) {
      setDraft(String(value));
      setMessage(`数値を入力してください。元の値（${value}）に戻しました。`);
    } else {
      const lo = min ?? -Infinity;
      const hi = max ?? Infinity;
      const clamped = Math.min(hi, Math.max(lo, round(n)));
      if (clamped !== round(n)) {
        const range = `${min ?? ""}〜${max ?? ""}${unit}`;
        setMessage(`${range}で入力してください。${clamped}にしました。`);
      }
      if (clamped !== value) onValueChange(clamped);
      setDraft(String(clamped));
    }
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focused.current = true;
    e.target.select();
    onFocus?.(e);
  };

  return (
    <>
      <input
        {...rest}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          message && "border-destructive",
          className
        )}
      />
      {message && (
        <p id={messageId} aria-live="polite" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </>
  );
}
