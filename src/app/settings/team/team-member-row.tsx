"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { setUserRole, type SettingsRole } from "@/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  initial: string;
  role: SettingsRole;
};

const ROLES: { value: SettingsRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full read/write/delete on all data" },
  { value: "member", label: "Member", hint: "Can create and edit records" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
];

export function TeamMemberRow({ member }: { member: TeamMember }) {
  const [role, setRole] = useState<SettingsRole>(member.role);
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: SettingsRole) => {
    if (next === role) return;
    const previous = role;
    setRole(next);
    setSaving(true);
    try {
      await setUserRole(member.id, next);
      toast.success(`${member.name} is now ${next}`);
    } catch (err) {
      setRole(previous);
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
      <div className="flex items-center gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {member.initial}
        </div>
        <div>
          <p className="font-medium">{member.name}</p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Select value={role} onValueChange={handleChange} disabled={saving}>
          <SelectTrigger className="w-[140px]" aria-label={`Role for ${member.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {ROLES.find((r) => r.value === role)?.hint}
        </span>
      </div>
    </div>
  );
}
