"use client";

import React from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemePicker } from "@/components/ThemePicker";
import { StatusSelector } from "@/components/StatusSelector";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Pick a palette, then switch between light and dark mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemePicker />
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mode</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Presence</CardTitle>
          <CardDescription>Control how you appear to others.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusSelector />
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Invisible renders as offline to everyone else while your session stays active.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
