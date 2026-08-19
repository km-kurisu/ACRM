"use client";

import React from "react";
import { UserProfile } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { StatusSelector } from "@/components/StatusSelector";

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details.</p>
      <Card className="glass mt-6 max-w-2xl">
        <UserProfile />
      </Card>
      <Card className="glass mt-6 max-w-2xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Control how you appear to others.
          </p>
          <div className="mt-4">
            <StatusSelector />
          </div>
        </div>
      </Card>
    </div>
  );
}
