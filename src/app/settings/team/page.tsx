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
import { TeamMemberRow, type TeamMember } from "./team-member-row";

export default async function TeamPage() {
  await requireAdmin();

  const client = await clerkClient();
  const users = await client.users.getUserList();

  const members: TeamMember[] = users.data.map((user) => ({
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user",
    email: user.emailAddresses[0]?.emailAddress ?? "",
    initial:
      user.firstName?.charAt(0) ||
      user.emailAddresses[0]?.emailAddress.charAt(0) ||
      "?",
    role: ((user.publicMetadata?.role as string) || "member") as TeamMember["role"],
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
      <p className="mt-1 text-muted-foreground">
        Manage roles for everyone in your organization.
      </p>

      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
