"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id?: string;
  label: string;
  hint?: React.ReactNode;
  unit?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, hint, unit, className, children }: FieldProps) {
  const reactId = React.useId();
  const labelId = `${reactId}-label`;
  const hintId = `${reactId}-hint`;
  // Without a control id the field wraps several controls (checkbox lists, a switch row),
  // so it is announced as a named group instead of an orphaned label.
  const isGroup = id === undefined;
  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      role={isGroup ? "group" : undefined}
      aria-labelledby={isGroup ? labelId : undefined}
      aria-describedby={isGroup && hint ? hintId : undefined}
    >
      <div className="flex items-baseline justify-between">
        {isGroup ? (
          <span id={labelId} className="text-sm font-medium leading-none">{label}</span>
        ) : (
          <Label htmlFor={id}>{label}</Label>
        )}
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {children}
      {hint && <p id={isGroup ? hintId : undefined} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
