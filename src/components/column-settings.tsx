"use client";

import { useState } from "react";
import { Columns3, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameColumnDialog, type RenameTarget } from "@/components/rename-column-dialog";

export function ColumnSettings({
  columns,
  hidden,
  onToggle,
  onRename,
}: {
  columns: { key: string; label: string }[];
  hidden: string[];
  onToggle: (key: string) => void;
  onRename: (key: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<RenameTarget>(null);

  const hiddenSet = new Set(hidden);
  const visibleCount = columns.length - hiddenSet.size;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shrink-0 text-muted-foreground">
            <Columns3 className="size-4" />
            Columns
            <span className="text-xs tabular-nums text-muted-foreground">
              {visibleCount}/{columns.length}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong w-72">
          <div className="max-h-72 overflow-y-auto py-1">
            {columns.map((col) => {
              const isHidden = hiddenSet.has(col.key);
              return (
                <div key={col.key} className="flex items-center gap-2 px-2 py-1">
                  <Checkbox
                    checked={!isHidden}
                    disabled={!isHidden && visibleCount === 1}
                    onCheckedChange={() => onToggle(col.key)}
                    aria-label={`Show ${col.label}`}
                  />
                  <span className="flex-1 truncate text-sm">{col.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-label={`Rename ${col.label}`}
                    onClick={() => {
                      setOpen(false);
                      setTarget({ key: col.key, label: col.label });
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
          {hidden.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => hidden.forEach(onToggle)}>
                Show all columns
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameColumnDialog
        target={target}
        onClose={() => setTarget(null)}
        onSubmit={(key, label) => {
          onRename(key, label);
          setTarget(null);
        }}
      />
    </>
  );
}