import React from "react";
import Link from "next/link";
import {
  Users,
  Megaphone,
  Handshake,
  FileText,
  CircleX,
  CalendarClock,
  Briefcase,
  Wallet,
  Percent,
  CirclePause,
  ArrowRight,
} from "lucide-react";
import { getDashboardOverview, type CountItem } from "@/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineBarChart, DealStatusDonutChart } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  Negotiating: "bg-foreground/10 text-foreground",
  Interested: "bg-foreground/10 text-foreground",
  "Meeting Scheduled": "bg-foreground/15 text-foreground",
  "Not Interested": "bg-muted text-muted-foreground line-through",
  "No Response": "bg-muted text-muted-foreground",
  Signed: "bg-foreground/10 text-foreground",
};

const PIPELINE_ICONS: Record<string, typeof Users> = {
  "Total Prospects": Users,
  "Creators Contacted": Megaphone,
  "Active Negotiations": Handshake,
  "Signed Creators": FileText,
  Rejected: CircleX,
  "Follow-ups (7d)": CalendarClock,
  "Total Brand Deals": Briefcase,
  "Total Revenue": Wallet,
  Commission: Percent,
  "On Hold": CirclePause,
};

function fmtINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function statCard(label: string, value: number, money?: boolean) {
  const Icon = PIPELINE_ICONS[label] ?? Users;
  return (
    <Card key={label} className="glass transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm text-muted-foreground">{label}</span>
          <Icon className="size-4 shrink-0 text-primary" />
        </div>
        <p className="mt-2 truncate text-2xl font-bold tabular-nums text-gradient">
          {money ? fmtINR(value) : value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  description,
  data,
  total,
  money,
}: {
  title: string;
  description: string;
  data: CountItem[];
  total: number;
  money?: boolean;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold tabular-nums">
                  {money ? fmtINR(item.value) : item.value}
                  {!money && total > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">({pct}%)</span>}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  const pipelineCounts: Record<string, number> = Object.fromEntries(
    overview.pipeline.map((p) => [p.label, p.value])
  );

  const statCards = [
    statCard("Total Prospects", overview.creatorsCount),
    statCard("Creators Contacted", pipelineCounts["Contacted"] ?? 0),
    statCard("Active Negotiations", pipelineCounts["Negotiating"] ?? 0),
    statCard("Signed Creators", pipelineCounts["Signed"] ?? 0),
    statCard("Rejected", pipelineCounts["Rejected"] ?? 0),
    statCard("Follow-ups (7d)", overview.followUpsIn7Days),
    statCard("Total Brand Deals", overview.totalDeals),
    statCard("Total Revenue", overview.totalRevenue, true),
    statCard("Commission", overview.agencyCommission, true),
    statCard("On Hold", overview.onHold),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Creator &amp; brand deal pipeline overview.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{statCards}</section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Pipeline Breakdown"
          description={`Where all ${overview.creatorsCount} creators stand right now`}
          data={overview.pipeline}
          total={overview.creatorsCount}
        />
        <BreakdownCard
          title="Brand Deal Status"
          description={`Campaign status across ${overview.totalDeals} deals`}
          data={overview.dealStatus}
          total={overview.totalDeals}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Creator Pipeline by Status</CardTitle>
            <CardDescription>Creators grouped by their current stage</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineBarChart data={overview.pipeline} />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Brand Deals by Campaign Status</CardTitle>
            <CardDescription>Share of deals across campaign stages</CardDescription>
          </CardHeader>
          <CardContent>
            <DealStatusDonutChart data={overview.dealStatus} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Top Creators</CardTitle>
            <CardDescription>Priority roster, ranked</CardDescription>
            <CardAction>
              <Link href="/master-data" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {overview.topCreators.map((c) => (
              <Link
                key={c.id}
                href="/master-data"
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {c.creator_name.charAt(0).toUpperCase()}
                  </div>
                  <p className="truncate text-sm font-medium">{c.creator_name}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">Roster</span>
              </Link>
            ))}
            {overview.topCreators.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground">No creators yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Recent Outreach</CardTitle>
            <CardDescription>Latest contact activity</CardDescription>
            <CardAction>
              <Link href="/outreach" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {overview.recentOutreach.slice(0, 6).map((o) => (
              <Link
                key={o.id}
                href="/outreach"
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.creators?.creator_name ?? "Unknown creator"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.contact_method ?? "—"} · {o.date_contacted ? new Date(o.date_contacted).toLocaleDateString() : "no date"}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[o.current_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                  {o.current_status || "—"}
                </Badge>
              </Link>
            ))}
            {overview.recentOutreach.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground">No outreach yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
