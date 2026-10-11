"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useHousingStore, getStepIds, type StepId } from "@/store/housingStore";
import { whenIdle } from "@/lib/when-idle";
import { TrailSidebar } from "./TrailSidebar";
import { ToastHost } from "./ToastHost";
import { BuildingStep } from "./steps/BuildingStep";
import { lazyStep } from "./lazy-step";

type NavProps = { onNext: () => void; onBack: () => void };

// Only the first step (where every visit starts) ships with the page. The others — the results
// step brings the chart library — load once the page is idle (see the effect below), or right
// away when a reload or a shared link opens on them.
const PerformanceStep = lazyStep<NavProps>(() => import("./steps/PerformanceStep").then((m) => m.PerformanceStep));
const EquipmentStep = lazyStep<NavProps>(() => import("./steps/EquipmentStep").then((m) => m.EquipmentStep));
const RenovationStep = lazyStep<NavProps>(() => import("./steps/RenovationStep").then((m) => m.RenovationStep));
const EconomyStep = lazyStep<NavProps>(() => import("./steps/EconomyStep").then((m) => m.EconomyStep));
const ScenarioStep = lazyStep<NavProps>(() => import("./steps/ScenarioStep").then((m) => m.ScenarioStep));
const ResultsStep = lazyStep<{ onBack: () => void }>(() => import("./steps/ResultsStep").then((m) => m.ResultsStep));

const LAZY_STEPS: Partial<Record<StepId, { preload: () => Promise<void> }>> = {
  performance: PerformanceStep,
  equipment: EquipmentStep,
  renovation: RenovationStep,
  economy: EconomyStep,
  scenario: ScenarioStep,
  results: ResultsStep,
};

// The persisted step is already rehydrated from localStorage when this module runs; start
// fetching its code now rather than at idle time.
if (typeof window !== "undefined") {
  const { currentStep, input } = useHousingStore.getState();
  const ids = getStepIds(input.mode);
  void LAZY_STEPS[ids[Math.min(currentStep, ids.length - 1)]]?.preload().catch(() => {});
}

export function SimulatorApp() {
  const currentStep = useHousingStore((s) => s.currentStep);
  const setStep = useHousingStore((s) => s.setStep);
  const mode = useHousingStore((s) => s.input.mode);

  // Fetch the remaining steps while the page is idle after the first paint, so moving on never
  // waits for them.
  useEffect(
    () =>
      whenIdle(() => {
        for (const step of Object.values(LAZY_STEPS)) void step?.preload().catch(() => {});
      }),
    [],
  );

  const stepIds = getStepIds(mode);
  const goNext = () => setStep(Math.min(currentStep + 1, stepIds.length - 1));
  const goBack = () => setStep(Math.max(currentStep - 1, 0));
  const stepId: StepId = stepIds[Math.min(currentStep, stepIds.length - 1)];

  const mainRef = useRef<HTMLElement | null>(null);
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    // Skip auto-scroll right after the first mount (so it does not jump to the persisted currentStep)
    if (typeof window === "undefined") return;
    const top = mainRef.current?.getBoundingClientRect().top ?? 0;
    if (Math.abs(top) > 4) {
      const y = window.scrollY + top - 16;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  }, [currentStep]);

  return (
    <>
    {/* SHIG 59 / 60: app name + a way back to the top page (no browser back in standalone PWA) */}
    <header className="border-b">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
        <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center font-semibold tracking-tight">
          住宅性能シミュレーター
        </Link>
      </div>
    </header>
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6 max-w-[1200px] w-full mx-auto px-5 md:px-8 py-4 lg:py-8">
      <aside className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto rounded-lg border bg-card">
        <TrailSidebar />
      </aside>
      <main id="main" ref={mainRef} className="min-w-0">
        {stepId === "building" && <BuildingStep onNext={goNext} />}
        {stepId === "performance" && <PerformanceStep onNext={goNext} onBack={goBack} />}
        {stepId === "equipment" && <EquipmentStep onNext={goNext} onBack={goBack} />}
        {stepId === "renovation" && <RenovationStep onNext={goNext} onBack={goBack} />}
        {stepId === "economy" && <EconomyStep onNext={goNext} onBack={goBack} />}
        {stepId === "scenario" && <ScenarioStep onNext={goNext} onBack={goBack} />}
        {stepId === "results" && <ResultsStep onBack={goBack} />}
      </main>
    </div>
    <ToastHost />
    </>
  );
}
