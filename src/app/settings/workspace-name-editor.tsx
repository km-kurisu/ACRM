"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createWorkspace, updateWorkspaceName, type WorkspaceInfo } from "@/actions";
import { useRole } from "@/lib/rbac";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WorkspaceNameEditor({ workspaces }: { workspaces: WorkspaceInfo[] }) {
  const role = useRole();
  const isAdmin = role === "admin";
  const [items, setItems] = useState(workspaces);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No workspace found. Run the latest db/schema.sql in Supabase to create one.
      </p>
    );
  }

  const handleSave = async () => {
    if (!editingId || !name.trim()) return;
    const workspace = items.find((item) => item.id === editingId);
    if (!workspace || name.trim() === workspace.name) return;
    setSaving(true);
    try {
      await updateWorkspaceName(workspace.id, name);
      setItems((current) => current.map((item) => item.id === workspace.id ? { ...item, name: name.trim() } : item));
      setEditingId(null);
      toast.success("Workspace name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update workspace name");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (workspace: WorkspaceInfo) => {
    setEditingId(workspace.id);
    setName(workspace.name);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const workspace = await createWorkspace(name);
      setItems((current) => [...current, workspace]);
      setName("");
      toast.success("Workspace created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="space-y-2">
          {items.map((workspace) => <Input key={workspace.id} value={workspace.name} readOnly className="max-w-sm bg-muted/50" aria-label={workspace.name} />)}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Only admins can rename the workspace.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((workspace) => (
          <div key={workspace.id} className="flex max-w-lg items-center gap-2">
            {editingId === workspace.id ? (
              <>
                <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Workspace name" />
                <Button type="button" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save"}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Input value={workspace.name} readOnly aria-label={workspace.name} />
                <Button type="button" variant="outline" onClick={() => startEditing(workspace)}>Edit</Button>
              </>
            )}
          </div>
        ))}
        <div className="flex max-w-lg items-center gap-2 border-t border-border/40 pt-3">
          <Input value={editingId ? "" : name} onChange={(e) => setName(e.target.value)} placeholder="New workspace name" aria-label="New workspace name" />
          <Button type="button" onClick={handleCreate} disabled={saving || Boolean(editingId) || !name.trim()}>Add</Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This name identifies your agency workspace across the CRM.
      </p>
    </div>
  );
}
