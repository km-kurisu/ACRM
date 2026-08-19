"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TopCreator = {
  id: string;
  creator_name: string;
  total_deal_value: number;
  total_followers: number;
  engagement_rate: number;
};

export function TopCreatorsSection({
  topCreators,
}: {
  topCreators: TopCreator[];
}) {
  const [sortBy, setSortBy] = useState<string>("deal_value");

  const sorted = [...topCreators].sort((a, b) => {
    switch (sortBy) {
      case "deal_value":
        return b.total_deal_value - a.total_deal_value;
      case "followers":
        return b.total_followers - a.total_followers;
      case "engagement":
        return b.engagement_rate - a.engagement_rate;
      default:
        return 0;
    }
  });

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Top Creators</CardTitle>
        <CardDescription>Priority roster, ranked</CardDescription>
        <CardAction className="flex items-center gap-2">
          <SlidersHorizontal className="size-3 text-muted-foreground" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong">
              <SelectItem value="deal_value">Deal Value</SelectItem>
              <SelectItem value="followers">Followers</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/creators" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted.map((c) => (
          <Link
            key={c.id}
            href={`/creators/${c.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {c.creator_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.creator_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {sortBy === "deal_value" && `₹${c.total_deal_value.toLocaleString("en-IN")} deals`}
                  {sortBy === "followers" && `${c.total_followers.toLocaleString("en-IN")} followers`}
                  {sortBy === "engagement" && `${c.engagement_rate}% engagement`}
                </p>
              </div>
            </div>
          </Link>
        ))}
        {sorted.length === 0 && (
          <p className="px-3 py-6 text-sm text-muted-foreground">No creators yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
