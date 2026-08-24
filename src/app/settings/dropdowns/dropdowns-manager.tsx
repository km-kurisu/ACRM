"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, X } from "lucide-react";
import {
  createDropdownOption,
  deleteDropdownOption,
  renameDropdownOption,
} from "@/actions";
import { useDropdownOptions } from "@/lib/use-dropdown-options";
import {
  AUTOMATION_FIELDS,
  DEFAULT_OPTIONS,
  DROPDOWN_FIELD_KEYS,
  FIELD_LABELS,
  type DropdownFieldKey,
} from "@/lib/dropdown-options";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function FieldCard({
  fieldKey,
  values,
  onChanged,
}: {
  fieldKey: DropdownFieldKey;
  values: string[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState("");
  const [renamingFrom, setRenamingFrom] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, successMessage: string): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function confirmRename(original: string) {
    void run(() => renameDropdownOption(fieldKey, original, renameDraft), "Value renamed").then(
      (ok) => {
        if (ok) setRenamingFrom(null);
      }
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">{FIELD_LABELS[fieldKey]}</CardTitle>
        {AUTOMATION_FIELDS.includes(fieldKey) && (
          <CardDescription>Used by dashboard automation — renames affect pipeline grouping.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {values.length === 0 && <p className="text-sm text-muted-foreground">No values yet.</p>}
        {values.map((value) =>
          renamingFrom === value ? (
            <div key={value} className="flex items-center gap-2">
              <Input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) {
                    e.preventDefault();
                    confirmRename(value);
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={`Confirm rename of ${value}`}
                onClick={() => confirmRename(value)}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label="Cancel rename"
                onClick={() => setRenamingFrom(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div key={value} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{value}</span>
              <span className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Rename ${value}`}
                  onClick={() => {
                    setRenamingFrom(value);
                    setRenameDraft(value);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${value}`}
                  disabled={busy}
                  onClick={() => void run(() => deleteDropdownOption(fieldKey, value), "Value removed")}
                >
                  <X className="size-4" />
                </Button>
              </span>
            </div>
          )
        )}
        <form
          className="flex items-center gap-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const draft = adding;
            if (!draft.trim()) return;
            void run(async () => {
              await createDropdownOption(fieldKey, draft);
              setAdding("");
            }, "Value added");
          }}
        >
          <Input
            placeholder="Add a value…"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className="h-8"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={busy || !adding.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function DropdownsManager() {
  const { options, reload } = useDropdownOptions();

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Dropdown Options</h2>
      <p className="mt-1 text-muted-foreground">
        Edit, add, or remove the choices offered across the CRM&apos;s status and type menus.
        Removing a value still in use is blocked until records are reassigned; renaming updates
        those records automatically.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {DROPDOWN_FIELD_KEYS.map((key) => (
          <FieldCard
            key={key}
            fieldKey={key}
            values={options[key] ?? DEFAULT_OPTIONS[key]}
            onChanged={() => void reload()}
          />
        ))}
      </div>
    </div>
  );
}
