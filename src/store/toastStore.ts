import { create } from "zustand";

/**
 * Transient notifications (not persisted). Used for undo after silent actions
 * (SHIG 57 / 54) and for constructive error messages (SHIG 55).
 */
export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Move keyboard focus to the action button when the toast appears. Use it when the
   * element that triggered the toast has just been removed (e.g. a delete button), so
   * keyboard users can reach undo instead of being dropped at the top of the page.
   */
  focusAction?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { tone: "info", ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
