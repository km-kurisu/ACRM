"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DropSide } from "@/lib/table-view";

export type ColumnDragApi = {
  dragKey: string | null;
  overKey: string | null;
  overSide: DropSide | null;
  onDragStart: (key: string) => (e: React.DragEvent<HTMLElement>) => void;
  onDragOver: (key: string) => (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (key: string) => (e: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export function useColumnDrag(
  onMove: (fromKey: string, toKey: string, side: DropSide) => void
): ColumnDragApi {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; side: DropSide } | null>(null);

  const onDragStart = (key: string) => (e: React.DragEvent<HTMLElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
    setDragKey(key);
  };

  const onDragOver = (key: string) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const side: DropSide = e.clientX > rect.left + rect.width / 2 ? "after" : "before";
    setOver((prev) => (prev?.key === key && prev.side === side ? prev : { key, side }));
  };

  const onDrop = (key: string) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const from = dragKey || e.dataTransfer.getData("text/plain");
    const side = over?.key === key ? over.side : "before";
    setDragKey(null);
    setOver(null);
    if (from && from !== key) onMove(from, key, side);
  };

  const onDragEnd = () => {
    setDragKey(null);
    setOver(null);
  };

  return {
    dragKey,
    overKey: over?.key ?? null,
    overSide: over?.side ?? null,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}

export function DraggableTableHead({
  columnKey,
  drag,
  className,
  children,
}: {
  columnKey: string;
  drag: ColumnDragApi;
  className?: string;
  children: React.ReactNode;
}) {
  const isDragging = drag.dragKey === columnKey;
  const dropSide = drag.overKey === columnKey ? drag.overSide : null;

  return (
    <TableHead
      draggable
      onDragStart={drag.onDragStart(columnKey)}
      onDragOver={drag.onDragOver(columnKey)}
      onDrop={drag.onDrop(columnKey)}
      onDragEnd={drag.onDragEnd}
      className={cn(
        "group relative cursor-grab pl-4 select-none active:cursor-grabbing",
        isDragging && "opacity-40",
        dropSide && "bg-accent",
        className
      )}
    >
      <GripVertical className="pointer-events-none absolute left-0.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100" />
      {children}
      {dropSide === "before" && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-primary" />
      )}
      {dropSide === "after" && (
        <span className="pointer-events-none absolute inset-y-0 right-0 w-0.5 bg-primary" />
      )}
    </TableHead>
  );
}