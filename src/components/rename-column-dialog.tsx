"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type RenameTarget = { key: string; label: string } | null;

export function RenameColumnDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: RenameTarget;
  onClose: () => void;
  onSubmit: (key: string, label: string) => void;
}) {
  if (!target) return null;

  return <RenameForm key={target.key} target={target} onClose={onClose} onSubmit={onSubmit} />;
}

function RenameForm({
  target,
  onClose,
  onSubmit,
}: {
  target: { key: string; label: string };
  onClose: () => void;
  onSubmit: (key: string, label: string) => void;
}) {
  const [value, setValue] = useState(target.label);
  const trimmed = value.trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-strong gap-3 sm:max-w-xs">
        <DialogHeader className="gap-1 pr-6">
          <DialogTitle>Rename column</DialogTitle>
          <DialogDescription className="text-xs">Only you see this name.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!trimmed) return;
            onSubmit(target.key, trimmed);
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Column name"
            aria-label="Column name"
            className="h-8"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed || trimmed === target.label}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}