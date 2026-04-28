"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SimulationOutput } from "@/lib/housing/types";

export function PdfExportButton({ output }: { output: SimulationOutput }) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={onExport} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      PDF を保存
    </Button>
  );
}
