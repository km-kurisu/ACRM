"use client";

import React, { useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setInvisible } from "@/actions";

export default function ProfilePage() {
  const [isInvisible, setIsInvisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await setInvisible(!isInvisible);
      setIsInvisible(!isInvisible);
    } catch (error) {
      console.error("Failed to toggle invisible:", error);
    } finally {
      setLoading(false);
    }
  };

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
          <Button
            variant={isInvisible ? "default" : "outline"}
            className="mt-4"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? "Updating..." : isInvisible ? "Appear Invisible" : "Appear Online"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
