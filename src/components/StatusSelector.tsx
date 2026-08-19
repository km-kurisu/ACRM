"use client";

import React, { useState, useEffect } from "react";
import { setPresenceStatus } from "@/actions";
import type { PresenceStatus } from "@/lib/presence";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: PresenceStatus; label: string; color: string }[] = [
  { value: "active", label: "Active", color: "bg-green-500" },
  { value: "inactive", label: "Inactive", color: "bg-yellow-500" },
  { value: "offline", label: "Offline", color: "bg-gray-400" },
  { value: "invisible", label: "Invisible", color: "bg-purple-500" },
];

export function StatusSelector({ className }: { className?: string }) {
  const [status, setStatus] = useState<PresenceStatus>("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/presence")
      .then((r) => r.json())
      .then((data) => {
        if (data.status_override && STATUS_OPTIONS.some((o) => o.value === data.status_override)) {
          setStatus(data.status_override);
        } else {
          setStatus(data.status || "active");
        }
      })
      .catch(() => setStatus("active"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (value: string) => {
    const newStatus = value as PresenceStatus;
    setStatus(newStatus);
    try {
      await setPresenceStatus(newStatus);
    } catch {
      setStatus(status);
    }
  };

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <Select value={status} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={cn("w-[130px]", className)}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", current?.color)} />
            {current?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", opt.color)} />
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
