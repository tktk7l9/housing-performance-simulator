"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight controlled modal. Does not use Radix; closes on ESC and backdrop click.
 * Keyboard: focus moves into the panel on open, Tab cycles inside it, and focus
 * returns to the opener on close. The rest of the page is marked inert meanwhile.
 */
export function Dialog({ open, ...rest }: DialogProps) {
  // The panel mounts only while open, so its mount/unmount doubles as open/close.
  if (!open) return null;
  return <DialogPanel {...rest} />;
}

function DialogPanel({ onOpenChange, title, description, children, className }: Omit<DialogProps, "open">) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Captured during the first render, before any child with autoFocus has taken focus
  const [opener] = React.useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );

  // Read through a ref so an inline onOpenChange does not re-run the focus setup on every render
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Move focus inside unless a child already took it (autoFocus); prefer a control over the close button
    if (!panel.contains(document.activeElement)) {
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      (items.find((el) => el !== closeRef.current) ?? items[0] ?? panel).focus();
    }

    // Everything outside the overlay is unreachable while the dialog is open (SHIG 33: one task at a time)
    const inerted: Element[] = [];
    let node: HTMLElement | null = panel.parentElement;
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", "");
          inerted.push(sibling);
        }
      }
      node = parent;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChangeRef.current(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      for (const el of inerted) el.removeAttribute("inert");
      opener?.focus?.();
    };
  }, [opener]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-md rounded-lg border bg-card text-card-foreground shadow-lg outline-none",
          className
        )}
      >
        {/* SHIG 13 / 78: 44px close target */}
        <button
          ref={closeRef}
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
        {(title || description) && (
          <header className="px-5 pt-5 pb-2 pr-12">
            {title && <h2 id={titleId} className="text-lg font-semibold">{title}</h2>}
            {description && <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </header>
        )}
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
