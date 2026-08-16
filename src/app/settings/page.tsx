"use client";

import React from "react";
import { OrganizationSwitcher, UserButton, RoleGuard } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Workspace and account configuration.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Manage your workspace and members.</CardDescription>
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
    </div>
  );
}
