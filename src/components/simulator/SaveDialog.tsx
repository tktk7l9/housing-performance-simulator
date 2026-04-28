"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHousingStore } from "@/store/housingStore";
import type { SimulationMode } from "@/lib/housing/types";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateDefaultName(mode: SimulationMode): string {
  const dateLabel = new Date().toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${mode === "renovation" ? "リフォーム" : "新築"} ${dateLabel}`;
}

export function SaveDialog({ open, onOpenChange }: SaveDialogProps) {
  const [name, setName] = useState("");
  const saveCurrent = useHousingStore((s) => s.saveCurrent);
  const mode = useHousingStore((s) => s.input.mode);
  const placeholder = generateDefaultName(mode);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCurrent(name.trim() || placeholder);
    setName("");
    onOpenChange(false);
  };

  const onCancel = () => {
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setName("");
        onOpenChange(o);
      }}
      title="シミュレーションを保存"
      description="ブラウザ内（localStorage）に保存します。最大 20 件まで保持されます。"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          maxLength={60}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">保存する</Button>
        </div>
      </form>
    </Dialog>
  );
}
