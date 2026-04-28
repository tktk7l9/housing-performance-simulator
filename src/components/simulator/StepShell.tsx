"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StepShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  hideNext?: boolean;
}

export function StepShell({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "次へ",
  hideNext,
}: StepShellProps) {
  return (
    <section className="flex w-full flex-col gap-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </header>
      <Card>
        <CardContent className="p-6 flex flex-col gap-5">{children}</CardContent>
      </Card>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={!onBack}>
          <ArrowLeft className="h-4 w-4" /> 前へ
        </Button>
        {!hideNext && (
          <Button type="button" onClick={onNext} disabled={!onNext}>
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
  );
}
