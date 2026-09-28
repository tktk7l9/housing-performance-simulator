"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type Toast } from "@/store/toastStore";

/** How long a notification stays before it closes itself (ms). */
export const TOAST_DURATION_MS = 8000;

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const actionRef = useRef<HTMLButtonElement>(null);
  // Hold the toast open while it is hovered or holds focus, so reading it or
  // reaching its button never races the timer (WCAG 2.2.1).
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    const timer = setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss, held]);

  useEffect(() => {
    if (toast.focusAction) actionRef.current?.focus();
  }, [toast.focusAction]);

  return (
    <div
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-lg border bg-card py-1 pl-4 pr-1 text-sm shadow-lg",
        toast.tone === "error" && "border-destructive"
      )}
    >
      <p className="flex-1 py-2 leading-snug">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          ref={actionRef}
          type="button"
          onClick={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
          className="min-h-11 shrink-0 rounded-md px-3 font-medium text-primary hover:bg-muted"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="閉じる"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
