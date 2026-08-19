import React from "react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";

const STATUS_COLORS: Record<PresenceStatus, string> = {
  active: "bg-green-500",
  inactive: "bg-yellow-500",
  offline: "bg-gray-400",
  invisible: "bg-purple-500",
};

interface StatusDotProps {
  status: PresenceStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        STATUS_COLORS[status],
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}
