"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { updateWorkspaceName, type WorkspaceInfo } from "@/actions";
import { useRole } from "@/lib/rbac";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WorkspaceNameEditor({ workspaces }: { workspaces: WorkspaceInfo[] }) {
  const role = useRole();
  const isAdmin = role === "admin";
  const workspace = workspaces[0];

  const [name, setName] = useState(workspace?.name ?? "");
  const [saving, setSaving] = useState(false);

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">
        No workspace found. Run the latest db/schema.sql in Supabase to create one.
      </p>
    );
  }

  const handleSave = async () => {
    if (name.trim() === workspace.name) return;
    setSaving(true);
    try {
      await updateWorkspaceName(workspace.id, name);
      toast.success("Workspace name updated");
    } catch (err) {
      setName(workspace.name);
      toast.error(err instanceof Error ? err.message : "Failed to update workspace name");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <Input value={name} readOnly className="max-w-sm bg-muted/50" aria-label="Workspace name" />
        <p className="mt-2 text-sm text-muted-foreground">
          Only admins can rename the workspace.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex max-w-sm items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name"
          aria-label="Workspace name"
        />
        <Button type="button" onClick={handleSave} disabled={saving || name.trim() === workspace.name}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This name identifies your agency workspace across the CRM.
      </p>
    </div>
  );
}
