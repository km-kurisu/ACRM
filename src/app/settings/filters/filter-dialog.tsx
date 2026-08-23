"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createCustomFilter, updateCustomFilter } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FIELD_MAP,
  FILTERABLE_FIELDS,
  OPS_BY_TYPE,
  validateConditions,
  type CustomFilter,
  type FilterCondition,
  type FilterVisibility,
} from "@/lib/custom-filters";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function emptyDraft(): FilterCondition {
  return { field: "", op: "", value: "" };
}

export function FilterDialog({
  open,
  onOpenChange,
  initial,
  isAdmin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CustomFilter | null;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<FilterVisibility>("personal");
  const [conditions, setConditions] = useState<FilterCondition[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setVisibility(initial?.visibility ?? "personal");
    const restored = (initial?.conditions ?? []).map((c) => ({
      field: c.field,
      op: c.op,
      value: c.value == null ? "" : String(c.value),
    }));
    setConditions(restored.length > 0 ? restored : [emptyDraft()]);
  }, [open, initial]);

  const validationError = validateConditions(conditions);
  const groups = [...new Set(FILTERABLE_FIELDS.map((f) => f.group))];

  function patch(index: number, next: Partial<FilterCondition>) {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const merged = { ...c, ...next };
        if (next.field && next.field !== c.field) {
          const def = FIELD_MAP.get(next.field);
          const allowed = def ? OPS_BY_TYPE[def.type] : [];
          if (!allowed.some((o) => o.op === merged.op)) merged.op = allowed[0]?.op ?? "";
        }
        return merged;
      })
    );
  }

  function removeAt(index: number) {
    setConditions((prev) => (prev.length === 1 ? [emptyDraft()] : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateConditions(conditions);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), visibility, conditions };
      if (initial) {
        await updateCustomFilter(initial.id, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await createCustomFilter(payload);
        toast.success(`Created ${payload.name}`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : "New Custom Filter"}</DialogTitle>
          <DialogDescription>Conditions combine with AND — a creator must match every one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cf-name">Name *</Label>
              <Input
                id="cf-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="High-priority gaming creators"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-visibility">Visible to</Label>
              <select
                id="cf-visibility"
                className={SELECT_CLASS}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as FilterVisibility)}
              >
                <option value="personal">Only me</option>
                {isAdmin && <option value="org">Everyone (workspace)</option>}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conditions</p>
            {conditions.map((c, i) => {
              const def = c.field ? FIELD_MAP.get(c.field) : undefined;
              const ops = def ? OPS_BY_TYPE[def.type] : [];
              const needsValue = c.op !== "empty" && c.op !== "notEmpty" && c.op !== "";
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Field"
                    className={`${SELECT_CLASS} w-44`}
                    value={c.field}
                    onChange={(e) => patch(i, { field: e.target.value })}
                  >
                    <option value="">Select field…</option>
                    {groups.map((g) => (
                      <optgroup key={g} label={g}>
                        {FILTERABLE_FIELDS.filter((f) => f.group === g).map((f) => (
                          <option key={f.field} value={f.field}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    aria-label="Operator"
                    className={`${SELECT_CLASS} w-32`}
                    value={c.op}
                    onChange={(e) => patch(i, { op: e.target.value })}
                    disabled={!def}
                  >
                    {!def && <option value="">—</option>}
                    {ops.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {needsValue &&
                    (def?.options ? (
                      <select
                        aria-label="Value"
                        className={`${SELECT_CLASS} w-40`}
                        value={c.value ?? ""}
                        onChange={(e) => patch(i, { value: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {def.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        aria-label="Value"
                        className="w-40"
                        type={def?.type === "number" ? "number" : def?.type === "date" ? "date" : "text"}
                        value={c.value ?? ""}
                        onChange={(e) => patch(i, { value: e.target.value })}
                      />
                    ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove condition ${i + 1}`}
                    onClick={() => removeAt(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => setConditions((prev) => [...prev, emptyDraft()])}
            >
              <Plus className="size-4" /> Add condition
            </Button>
            {validationError && <p className="text-xs text-destructive">{validationError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || validationError !== null}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create filter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
