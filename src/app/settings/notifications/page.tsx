"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const PREFS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    key: "notify_deal_updates",
    label: "Deal updates",
    description: "When a deal's campaign, invoice, or payment status changes.",
  },
  {
    key: "notify_contract_renewals",
    label: "Contract renewals",
    description: "When a creator contract is approaching its renewal date.",
  },
  {
    key: "notify_outreach_followups",
    label: "Outreach follow-ups",
    description: "When an outreach follow-up is due.",
  },
  {
    key: "notify_weekly_digest",
    label: "Weekly digest",
    description: "A weekly summary of pipeline and revenue activity.",
  },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() =>
        toast.error("Failed to load notification preferences")
      );
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await updateNotificationPreferences(next);
    } catch (err) {
      setPrefs(prefs);
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what you want to be notified about.</CardDescription>
      </CardHeader>
      <CardContent>
        {!prefs ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-0.5 size-4 rounded-[4px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {PREFS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start gap-3">
                <Checkbox
                  id={`pref-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={() => handleToggle(key)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`pref-${key}`}
                  className="flex flex-col gap-1 font-normal leading-tight"
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{description}</span>
                </Label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
