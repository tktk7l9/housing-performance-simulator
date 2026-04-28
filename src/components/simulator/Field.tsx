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
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
