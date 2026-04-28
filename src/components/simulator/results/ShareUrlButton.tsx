"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encodeInput } from "@/lib/share/encoder";
import type { HousingInput } from "@/lib/housing/types";

export function ShareUrlButton({ input }: { input: HousingInput }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const token = encodeInput(input);
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("URL をコピー:", url);
    }
  };

  return (
    <Button variant="outline" onClick={onShare}>
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "コピーしました" : "共有URLをコピー"}
    </Button>
  );
}
