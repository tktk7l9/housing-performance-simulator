"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { evaluateResult, WEIGHTS } from "@/lib/housing/evaluation";
import type { Grade } from "@/lib/housing/evaluation";
import type { SimulationOutput } from "@/lib/housing/types";
import { cn } from "@/lib/utils";

const GRADE_STYLE: Record<Grade, { ring: string; text: string; label: string; bg: string }> = {
  S: { ring: "ring-emerald-400", text: "text-emerald-600", label: "Excellent", bg: "from-emerald-50" },
  A: { ring: "ring-primary", text: "text-primary", label: "Good", bg: "from-blue-50" },
  B: { ring: "ring-blue-400", text: "text-blue-700", label: "Standard", bg: "from-blue-50/60" },
  C: { ring: "ring-amber-400", text: "text-amber-700", label: "Needs review", bg: "from-amber-50" },
  D: { ring: "ring-red-400", text: "text-red-700", label: "Unfavorable", bg: "from-red-50" },
};

export function EvaluationCard({ output }: { output: SimulationOutput }) {
  const evalResult = evaluateResult(output);
  if (!evalResult) return null;
  const style = GRADE_STYLE[evalResult.grade];

  return (
    <Card className={cn("relative overflow-hidden bg-gradient-to-br to-card", style.bg)}>
      <CardContent className="p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-7 items-start">
          {/* Score circle */}
          <div className="flex items-center gap-4 md:flex-col md:items-start">
            <ScoreCircle score={evalResult.score} grade={evalResult.grade} ringClass={style.ring} textClass={style.text} />
            <div className="md:text-center md:w-32">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Overall
              </div>
              <div className={cn("font-semibold", style.text)}>{style.label}</div>
            </div>
          </div>

          {/* Headline + strengths/cautions */}
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                総評（{evalResult.targetScenarioName} vs {evalResult.baselineScenarioName}）
              </div>
              <p className="text-base md:text-lg font-semibold leading-snug">
                {evalResult.headline}
              </p>
            </div>

            {evalResult.strengths.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {evalResult.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {evalResult.cautions.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {evalResult.cautions.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Sub-score bars */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t mt-1">
              <SubScore label="経済性" value={evalResult.breakdown.economy} max={WEIGHTS.economy} />
              <SubScore label="環境性" value={evalResult.breakdown.environment} max={WEIGHTS.environment} />
              <SubScore label="エネ自立" value={evalResult.breakdown.autonomy} max={WEIGHTS.autonomy} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ※ 採点は累計コスト削減（40点）・投資回収（20点）・CO2削減（25点）・自家消費と太陽光容量（15点）の合計100点。係数の詳細は「計算根拠」を参照。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCircle({
  score,
  grade,
  ringClass,
  textClass,
}: {
  score: number;
  grade: Grade;
  ringClass: string;
  textClass: string;
}) {
  // 円周進捗バー（svg circle）
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className={cn("relative h-24 w-24 rounded-full bg-card flex items-center justify-center ring-1", ringClass)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.92 0.01 245)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={textClass}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className={cn("font-mono text-2xl font-bold tabular-nums", textClass)}>{score}</span>
        <span className={cn("text-[10px] font-mono mt-1", textClass)}>/100 · {grade}</span>
      </div>
    </div>
  );
}

function SubScore({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-mono tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
