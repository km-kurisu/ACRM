"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Palette, Bell, ShieldCheck } from "lucide-react";
import { useRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings", label: "General", icon: Settings },
  { href: "/settings/team", label: "Team Members", icon: Users, adminOnly: true },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Workspace and account configuration.</p>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <nav aria-label="Settings sections" className="lg:w-56 lg:shrink-0">
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map(({ href, label, icon: Icon, adminOnly }) => {
              const active = pathname === href;
              const locked = Boolean(adminOnly) && role !== "admin";
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    if (locked) e.preventDefault();
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    locked && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {locked && <ShieldCheck className="ml-auto size-3.5" aria-label="Admin only" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
