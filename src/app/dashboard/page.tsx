import React from "react";
import Link from "next/link";
import { Users, Building2, Handshake, FileText, Megaphone, ArrowRight, Wallet } from "lucide-react";
import { getDashboardStats, listCreatorSummaries, listCompanySummaries, listOutreach } from "@/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  Negotiating: "bg-foreground/10 text-foreground",
  Interested: "bg-foreground/10 text-foreground",
  "Meeting Scheduled": "bg-foreground/15 text-foreground",
  "Not Interested": "bg-muted text-muted-foreground line-through",
  "No Response": "bg-muted text-muted-foreground",
  Signed: "bg-foreground/10 text-foreground",
};

const STAT_ICONS: Record<string, typeof Users> = {
  "Total Creators": Users,
  "Creators Contacted": Megaphone,
  "Signed Creators": FileText,
  "Total Brand Deals": Handshake,
  "Total Revenue": Wallet,
};

export default async function DashboardPage() {
  const [stats, creators, companies, outreach] = await Promise.all([
    getDashboardStats(),
    listCreatorSummaries(),
    listCompanySummaries(),
    listOutreach(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Agency overview at a glance.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = STAT_ICONS[stat.label] ?? Users;
          const display =
            stat.label === "Total Revenue" ? `$${stat.value.toLocaleString()}` : stat.value.toLocaleString();
          return (
            <Card key={stat.label} className="glass transition-all hover:-translate-y-0.5 hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums text-gradient">{display}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Top Creators</CardTitle>
            <CardDescription>Priority roster, ranked</CardDescription>
            <CardAction>
              <Link href="/creators" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {creators.map((c) => (
              <Link
                key={c.id}
                href="/creators"
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
            {creators.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">No creators yet.</p>}
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
            {outreach.slice(0, 6).map((o) => (
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
            {outreach.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">No outreach yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="glass">
          <CardHeader>
            <CardTitle>Partner Companies</CardTitle>
            <CardDescription>Brands we work with</CardDescription>
            <CardAction>
              <Link href="/companies" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link
                key={c.id}
                href="/companies"
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="truncate text-sm font-medium">{c.name}</p>
                </div>
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            {companies.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">No companies yet.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
