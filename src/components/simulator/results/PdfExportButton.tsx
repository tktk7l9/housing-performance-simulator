"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SimulationOutput } from "@/lib/housing/types";

export function PdfExportButton({ output, className }: { output: SimulationOutput; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onExport = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const [{ pdf }, { ResultPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ResultPdfDocument"),
      ]);
      const blob = await pdf(<ResultPdfDocument output={output} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `housing-performance-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // SHIG 55: say what happened and what to do next instead of stopping silently
      console.error("pdf export failed", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={onExport} disabled={busy} className={className}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        PDF を保存
      </Button>
      {failed && (
        <p role="alert" className="col-span-3 basis-full text-xs text-destructive">
          PDF を作成できませんでした。通信状態を確かめて、もう一度お試しください。
        </p>
      )}
    </>
  );
}
