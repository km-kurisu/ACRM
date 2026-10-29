"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from "lucide-react";
import { listAuditLogs, type AuditLogPage, type AuditLogRow } from "@/actions";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/audit-constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 30;

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "create") return "default";
  if (action === "delete") return "destructive";
  if (action === "import") return "secondary";
  return "outline";
}

function summarizeChanges(log: AuditLogRow): string {
  const changes = log.changes ?? {};
  if (typeof changes.count === "number") {
    return `Imported ${changes.count} record${changes.count === 1 ? "" : "s"}`;
  }
  if (changes.changed && typeof changes.changed === "object") {
    const fields = Object.keys(changes.changed as Record<string, unknown>);
    return fields.length > 0 ? `${fields.length} field${fields.length === 1 ? "" : "s"} changed` : "No field changes";
  }
  if (changes.created) return "Record created";
  if (changes.deleted) return "Record deleted";
  return "—";
}

function DetailDialog({ log, onClose }: { log: AuditLogRow | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(log)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{log?.entity_label || "Audit entry"}</DialogTitle>
          <DialogDescription>
            {log ? `${AUDIT_ACTION_LABELS[log.action] ?? log.action} by ${log.actor_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        {log && (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd>{formatTime(log.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entity</dt>
                <dd>{AUDIT_ENTITY_LABELS[log.entity_type] ?? log.entity_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entity ID</dt>
                <dd className="break-all font-mono text-xs">{log.entity_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Actor ID</dt>
                <dd className="break-all font-mono text-xs">{log.actor_id ?? "—"}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Changes</p>
              <pre className="max-h-[45vh] overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(log.changes, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogViewer() {
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    void listAuditLogs({
      page,
      pageSize: PAGE_SIZE,
      query,
      entityType: entityType || undefined,
      action: action || undefined,
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : "Failed to load audit logs");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, query, entityType, action, refreshKey]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
          <p className="mt-1 text-muted-foreground">
            Every create, update, delete, and import across the workspace.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            setRefreshKey((current) => current + 1);
          }}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {total === 0 ? "No matching activity" : `Showing ${start}–${end} of ${total}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actor or record..."
                className="pl-8"
              />
            </div>
            <Select
              value={entityType || "all"}
              onValueChange={(value) => {
                setEntityType(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {AUDIT_ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {AUDIT_ENTITY_LABELS[type] ?? type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={action || "all"}
              onValueChange={(value) => {
                setAction(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {AUDIT_ACTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {AUDIT_ACTION_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading activity...
                    </TableCell>
                  </TableRow>
                ) : data && data.rows.length > 0 ? (
                  data.rows.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">{formatTime(log.created_at)}</TableCell>
                      <TableCell>{log.actor_name}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)}>
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{AUDIT_ENTITY_LABELS[log.entity_type] ?? log.entity_type}</div>
                        <div className="max-w-48 truncate text-xs text-muted-foreground">
                          {log.entity_label || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{summarizeChanges(log)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View audit details"
                          onClick={() => setSelected(log)}
                        >
                          <Eye />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No audit entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
