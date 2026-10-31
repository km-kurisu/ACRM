"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createCustomRole, updateCustomRole, type CustomRole, type WorkspaceInfo } from "@/actions";
import { ALL_PERMISSIONS, type Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const defaultPermissions: Permission[] = ["dashboard:view"];

export function RolesManager({
  initialRoles,
  workspaces,
}: {
  initialRoles: CustomRole[];
  workspaces: WorkspaceInfo[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>(workspaces.map((workspace) => workspace.id));
  const [saving, setSaving] = useState(false);

  const startEditing = (role: CustomRole) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setPermissions(role.permissions);
    setWorkspaceIds(role.workspace_ids);
  };

  const reset = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPermissions(defaultPermissions);
    setWorkspaceIds(workspaces.map((workspace) => workspace.id));
  };

  const toggle = <T,>(items: T[], value: T, checked: boolean) =>
    checked ? [...items, value] : items.filter((item) => item !== value);

  const handleSave = async () => {
    if (!name.trim() || workspaceIds.length === 0) return;
    setSaving(true);
    try {
      const role = editing
        ? await updateCustomRole(editing.id, name, description, permissions, workspaceIds)
        : await createCustomRole(name, description, permissions, workspaceIds);
      setRoles((current) =>
        [...current.filter((item) => item.id !== role.id), role].sort((a, b) => a.name.localeCompare(b.name))
      );
      reset();
      toast.success(editing ? "Role updated" : "Role created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>Configure permissions and workspace access for custom roles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom roles have been created.</p>
          ) : roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">
                  {role.permissions.length} permissions · {role.workspace_ids.length} workspaces
                </p>
                {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
              </div>
              <Button type="button" variant="outline" onClick={() => startEditing(role)}>Edit</Button>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-border/40 pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Role name" aria-label="Role name" maxLength={50} />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" aria-label="Role description" />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Permissions</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_PERMISSIONS.map((permission) => (
                <label key={permission.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={permissions.includes(permission.value)}
                    onCheckedChange={(checked) =>
                      setPermissions((current) => toggle(current, permission.value, checked === true))
                    }
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Workspace access</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {workspaces.map((workspace) => (
                <label key={workspace.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={workspaceIds.includes(workspace.id)}
                    onCheckedChange={(checked) =>
                      setWorkspaceIds((current) => toggle(current, workspace.id, checked === true))
                    }
                  />
                  {workspace.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave} disabled={saving || !name.trim() || workspaceIds.length === 0}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create role"}
            </Button>
            {editing && <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
