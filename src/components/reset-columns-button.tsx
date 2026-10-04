"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResetColumnsButton({
  onReset,
  visible,
}: {
  onReset: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
      <RotateCcw className="size-3.5" /> Reset columns
    </Button>
  );
}