import React from "react";
import { listWorkspaces } from "@/actions";
import { OrganizationSwitcher, UserButton, RoleGuard } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { WorkspaceNameEditor } from "./workspace-name-editor";

export default async function SettingsPage() {
  const workspaces = await listWorkspaces();

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>The agency workspace your team shares.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceNameEditor workspaces={workspaces} />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Manage your Clerk organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RoleGuard minimumRole="admin">
            <OrganizationSwitcher />
          </RoleGuard>
          <RoleGuard minimumRole="viewer">
            <p className="text-sm text-muted-foreground">
              Organization switching is available to admins.
            </p>
          </RoleGuard>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out or manage your Clerk account.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserButton showName />
        </CardContent>
      </Card>
    </div>
  );
}
