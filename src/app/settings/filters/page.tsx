"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomFilter, listCustomFilters } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeFilter, type CustomFilter } from "@/lib/custom-filters";
import { useRole } from "@/lib/rbac";
import { FilterDialog } from "./filter-dialog";

export default function CustomFiltersSettingsPage() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [filters, setFilters] = useState<CustomFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFilter | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFilters(await listCustomFilters());
    } catch {
      toast.error("Could not load filters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(filter: CustomFilter) {
    if (!window.confirm(`Delete filter "${filter.name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomFilter(filter.id);
      toast.success(`Deleted ${filter.name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Custom Filters</CardTitle>
        <CardDescription>Saved creator filters for the dashboard and master data views.</CardDescription>
        <CardAction>
          <Button
            variant="secondary"
            className="glass"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> New Filter
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && filters.length === 0 && (
          <p className="text-sm text-muted-foreground">No filters yet. Create your first one.</p>
        )}
        {filters.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/40 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{f.name}</span>
                {f.visibility === "org" && <Badge className="bg-muted text-muted-foreground">Workspace</Badge>}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {describeFilter(f.conditions).join(" AND ")}
              </p>
            </div>
            {(f.visibility === "personal" || isAdmin) && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${f.name}`}
                  onClick={() => {
                    setEditing(f);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${f.name}`} onClick={() => handleDelete(f)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <FilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        isAdmin={isAdmin}
        onSaved={refresh}
      />
    </Card>
  );
}
