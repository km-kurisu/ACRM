import React from "react";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/rbac-server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage() {
  await requireAdmin();

  const client = await clerkClient();
  const users = await client.users.getUserList();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
      <p className="mt-1 text-muted-foreground">
        Manage team members and their roles.
      </p>

      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.data.map((user) => {
              const role =
                (user.publicMetadata?.role as string) || "member";
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.firstName?.charAt(0) ||
                        user.emailAddresses[0]?.emailAddress.charAt(0) ||
                        "?"}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {role}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
