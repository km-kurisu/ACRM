"use client";

import React from "react";
import { UserProfile } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details.</p>
      <Card className="glass mt-6 max-w-2xl">
        <UserProfile />
      </Card>
    </div>
  );
}
