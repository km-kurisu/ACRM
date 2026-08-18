"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Handshake, Megaphone, FileText, Sparkles, Menu, Database, Origami } from "lucide-react";
import { UserButton } from "@/lib/rbac";
import ThemeToggle from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";


const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/master-data", label: "Master Data", icon: Database },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/outreach", label: "Outreach", icon: Megaphone },
  { href: "/contracts", label: "Contracts", icon: FileText },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/40 bg-background/60 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border/40 px-6">
          <Origami />
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            AniCRM
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Profile</span>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass-nav sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="glass-strong w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BrandMark />
                  <span>AniCRM</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 flex items-center justify-between rounded-lg border border-border/40 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Profile</span>
                <UserButton />
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span>Moodly CRM</span>
          </Link>
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="flex min-h-screen flex-col md:pl-64">
        <main className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-border/40">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <span>AniCRM — Anime Creator Agency</span>
            </div>
            <span>© {new Date().getFullYear()} AniCRM</span>
          </div>
        </footer>
      </div>

      <Toaster richColors closeButton position="bottom-right" />
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function BrandMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background shadow-sm">
      <Sparkles className="size-4" />
    </span>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-foreground/[0.04] blur-3xl" />
      <div className="absolute top-1/3 -right-40 size-[30rem] rounded-full bg-foreground/[0.05] blur-3xl" />
      <div className="absolute bottom-0 left-1/4 size-[24rem] rounded-full bg-foreground/[0.03] blur-3xl" />
    </div>
  );
}
