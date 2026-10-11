"use client";

import { lazy, Suspense, useState, type ComponentType } from "react";

export type LazyStep<P extends object> = ComponentType<P> & { preload: () => Promise<void> };

function StepLoading() {
  return (
    <p role="status" className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      読み込み中…
    </p>
  );
}

/**
 * A step whose code is fetched on demand instead of with the first paint. `preload()` fetches it
 * ahead of time (SimulatorApp calls it once the page is idle); a step that mounts after that
 * renders synchronously, so moving to it shows no loading state. A failed fetch is forgotten so
 * the next mount or preload tries again.
 *
 * The Suspense boundary lives here, around the not-yet-loaded case only: a boundary around the
 * server-rendered first step would let React stream that step after a "読み込み中…" placeholder.
 */
export function lazyStep<P extends object>(load: () => Promise<ComponentType<P>>): LazyStep<P> {
  let Loaded: ComponentType<P> | undefined;
  let pending: Promise<void> | undefined;
  const preload = () => {
    pending ??= load().then(
      (component) => {
        Loaded = component;
      },
      (error: unknown) => {
        pending = undefined;
        throw error;
      },
    );
    return pending;
  };
  const Deferred = lazy(() => preload().then(() => ({ default: Loaded! })));
  function Step(props: P) {
    // Decided once per mount: switching from <Deferred> to <Loaded> later would remount the
    // step and drop its local state.
    const [Ready] = useState(() => Loaded);
    if (Ready) return <Ready {...props} />;
    return (
      <Suspense fallback={<StepLoading />}>
        <Deferred {...props} />
      </Suspense>
    );
  }
  return Object.assign(Step, { preload });
}
