# RBAC & Presence System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement role-based access control (admin/member/viewer) and Discord-style user presence system for the AnimeCRM application.

**Architecture:** Extend existing Clerk-based RBAC with server-side guards, middleware protection, and Supabase RLS policies. Add presence system with workspaces table, user_status tracking, and Supabase Realtime Presence.

**Tech Stack:** Next.js 16, Clerk v7 (@clerk/nextjs), Supabase (@supabase/supabase-js), TypeScript, React 19, zustand (client state), shadcn components

**Spec:** `docs/superpowers/specs/2026-08-19-rbac-presence-design.md`

## Global Constraints

- Next.js 16.3.0, Clerk v7.7.1, Supabase JS v2.112.2, React 19.2.8
- TypeScript strict mode enabled
- shadcn UI components (Radix-based)
- Follow existing file structure and naming conventions
- Don't touch unrelated code
- Use zod for validation where needed

---

## File Structure

### New Files
- `types/globals.d.ts` - Clerk session claims type definitions
- `src/middleware.ts` - Route protection middleware
- `src/app/settings/team/page.tsx` - Admin team management page
- `src/hooks/use-presence.ts` - Client-side presence hook
- `src/lib/presence.ts` - Server-side presence utilities
- `src/components/StatusDot.tsx` - Status indicator component
- `src/app/api/presence/route.ts` - Presence API endpoint
- `src/app/api/presence/heartbeat/route.ts` - Heartbeat endpoint

### Modified Files
- `src/lib/rbac.tsx` - Add requireAdmin/requireUser helpers
- `src/actions.ts` - Add RBAC guards to mutations
- `db/schema.sql` - Add workspaces/user_status tables, update RLS
- `src/lib/server.ts` - Add authenticated client creation
- `src/components/Shell.tsx` - Add status dot to user profile
- `src/app/profile/page.tsx` - Add invisible toggle
- `scripts/seed.js` - Seed user roles

---

### Task 1: Type Definitions & Clerk Configuration

**Files:**
- Create: `types/globals.d.ts`

**Interfaces:**
- Produces: `CustomJwtSessionClaims.Metadata.role` type

- [ ] **Step 1: Create globals.d.ts with Clerk session claims types**

```typescript
// types/globals.d.ts
declare global {
  namespace CustomJwtSessionClaims {
    interface Metadata {
      role?: "admin" | "member" | "viewer";
    }
  }
}

export {};
```

- [ ] **Step 2: Verify TypeScript recognizes the types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add types/globals.d.ts
git commit -m "feat: add Clerk session claims type definitions"
```

---

### Task 2: Server-Side RBAC Helpers

**Files:**
- Modify: `src/lib/rbac.tsx`

**Interfaces:**
- Consumes: `auth()` from `@clerk/nextjs/server`
- Produces: `requireAdmin()`, `requireUser()` functions

- [ ] **Step 1: Add requireAdmin function**

```typescript
// Add to src/lib/rbac.tsx
import { auth } from "@clerk/nextjs/server";

export async function requireAdmin(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  const role = (sessionClaims?.metadata?.role as string) || "member";
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return userId;
}
```

- [ ] **Step 2: Add requireUser function**

```typescript
// Add to src/lib/rbac.tsx after requireAdmin
export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return userId;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/rbac.tsx
git commit -m "feat: add requireAdmin and requireUser server helpers"
```

---

### Task 3: RBAC Middleware

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `auth()` from `@clerk/nextjs/server`
- Produces: Middleware that protects admin routes

- [ ] **Step 1: Create middleware.ts with route protection**

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher([
  "/settings/team(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata?.role as string) || "member";
  
  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Verify middleware compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add RBAC middleware for route protection"
```

---

### Task 4: Database Schema Updates

**Files:**
- Modify: `db/schema.sql`

**Interfaces:**
- Produces: workspaces table, user_status table, updated RLS policies

- [ ] **Step 1: Add workspaces table**

```sql
-- Add after existing tables
-- ------------------------------------------------------------
-- workspaces — multi-workspace support (future-proofing)
-- ------------------------------------------------------------
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'default',
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Seed default workspace
insert into public.workspaces (id, name) values 
    ('00000000-0000-0000-0000-000000000001', 'default')
on conflict do nothing;
```

- [ ] **Step 2: Add user_status table**

```sql
-- ------------------------------------------------------------
-- user_status — presence tracking per workspace
-- ------------------------------------------------------------
create table if not exists public.user_status (
    user_id text not null references public.users(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    status_override text check (status_override in ('active', 'inactive', 'invisible')),
    last_active_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    primary key (user_id, workspace_id)
);
```

- [ ] **Step 3: Add RLS for workspaces and user_status**

```sql
-- ------------------------------------------------------------
-- RLS for new tables
-- ------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.user_status enable row level security;

create policy "workspaces select authenticated" on public.workspaces
    for select using (auth.uid() is not null);

create policy "user_status select authenticated" on public.user_status
    for select using (auth.uid() is not null);

create policy "user_status insert own" on public.user_status
    for insert with check (auth.uid()::text = user_id);

create policy "user_status update own" on public.user_status
    for update using (auth.uid()::text = user_id);
```

- [ ] **Step 4: Update existing RLS policies for RBAC**

```sql
-- Update creators policies
drop policy if exists "creators full access" on public.creators;

create policy "creators select authenticated" on public.creators
    for select using (auth.uid() is not null);

create policy "creators insert admin" on public.creators
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "creators update admin" on public.creators
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "creators delete admin" on public.creators
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Repeat for outreach, contracts, companies, deals, users
-- (Same pattern: SELECT for authenticated, INSERT/UPDATE/DELETE for admin)
```

- [ ] **Step 5: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add workspaces and user_status tables with RLS"
```

---

### Task 5: Server-Side Presence Utilities

**Files:**
- Create: `src/lib/presence.ts`

**Interfaces:**
- Consumes: Supabase client, auth()
- Produces: `getEffectiveStatus()`, `updateUserStatus()`, `getUserStatus()`

- [ ] **Step 1: Create presence.ts with status logic**

```typescript
// src/lib/presence.ts
import { auth } from "@clerk/nextjs/server";
import { db } from "./server";

export type PresenceStatus = "active" | "inactive" | "offline";

export type UserPresence = {
  user_id: string;
  workspace_id: string;
  status_override: string | null;
  last_active_at: string;
  is_online: boolean;
};

export function getEffectiveStatus(
  statusOverride: string | null,
  isOnline: boolean,
  lastActiveAt: string,
  currentUserId: string,
  viewerUserId: string
): PresenceStatus {
  if (statusOverride === "invisible") {
    return currentUserId === viewerUserId ? "active" : "offline";
  }
  if (!isOnline) return "offline";
  if (Date.now() - new Date(lastActiveAt).getTime() > 10 * 60 * 1000) {
    return "inactive";
  }
  return "active";
}

export async function getUserStatus(
  userId: string,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<UserPresence | null> {
  const { data, error } = await db
    .from("user_status")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .single();
  
  if (error || !data) return null;
  return data as UserPresence;
}

export async function updateUserStatus(
  userId: string,
  statusOverride: string | null,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<void> {
  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      status_override: statusOverride,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });
  
  if (error) throw new Error(error.message);
}

export async function updateLastActive(
  userId: string,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<void> {
  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });
  
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/presence.ts
git commit -m "feat: add server-side presence utilities"
```

---

### Task 6: Presence API Endpoints

**Files:**
- Create: `src/app/api/presence/route.ts`
- Create: `src/app/api/presence/heartbeat/route.ts`

**Interfaces:**
- Consumes: presence.ts functions
- Produces: GET /api/presence, POST /api/presence/heartbeat

- [ ] **Step 1: Create presence list endpoint**

```typescript
// src/app/api/presence/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserStatus, getEffectiveStatus } from "@/lib/presence";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getUserStatus(userId);
  if (!status) {
    return NextResponse.json({ 
      status: "offline",
      last_active_at: null 
    });
  }

  // For now, assume online if last_active_at is recent
  // Real implementation would check Supabase Realtime presence
  const isOnline = Date.now() - new Date(status.last_active_at).getTime() < 60 * 1000;
  
  const effectiveStatus = getEffectiveStatus(
    status.status_override,
    isOnline,
    status.last_active_at,
    userId,
    userId
  );

  return NextResponse.json({
    status: effectiveStatus,
    last_active_at: status.last_active_at,
    status_override: status.status_override,
  });
}
```

- [ ] **Step 2: Create heartbeat endpoint**

```typescript
// src/app/api/presence/heartbeat/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateLastActive } from "@/lib/presence";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await updateLastActive(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/presence/route.ts src/app/api/presence/heartbeat/route.ts
git commit -m "feat: add presence API endpoints"
```

---

### Task 7: Client-Side Presence Hook

**Files:**
- Create: `src/hooks/use-presence.ts`

**Interfaces:**
- Consumes: fetch /api/presence, /api/presence/heartbeat
- Produces: `usePresence()` hook

- [ ] **Step 1: Create use-presence.ts hook**

```typescript
// src/hooks/use-presence.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PresenceStatus } from "@/lib/presence";

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function usePresence() {
  const [status, setStatus] = useState<PresenceStatus>("offline");
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/presence/heartbeat", { method: "POST" });
      lastInteractionRef.current = Date.now();
    } catch (error) {
      console.error("Heartbeat failed:", error);
    }
  }, []);

  const updateStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/presence");
      const data = await response.json();
      setStatus(data.status);
      setLastActiveAt(data.last_active_at);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  }, []);

  const handleActivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
    sendHeartbeat();
  }, [sendHeartbeat]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleActivity();
    }
  }, [handleActivity]);

  useEffect(() => {
    // Set up activity listeners
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set up heartbeat interval
    heartbeatTimerRef.current = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction < IDLE_TIMEOUT) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Set up idle detection
    idleTimerRef.current = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction >= IDLE_TIMEOUT && status !== "offline") {
        setStatus("inactive");
      }
    }, 60 * 1000); // Check every minute

    // Initial heartbeat and status fetch
    sendHeartbeat();
    updateStatus();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange, sendHeartbeat, updateStatus, status]);

  return { status, lastActiveAt };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-presence.ts
git commit -m "feat: add client-side presence hook"
```

---

### Task 8: StatusDot Component

**Files:**
- Create: `src/components/StatusDot.tsx`

**Interfaces:**
- Consumes: PresenceStatus type
- Produces: StatusDot React component

- [ ] **Step 1: Create StatusDot.tsx component**

```typescript
// src/components/StatusDot.tsx
import React from "react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";

const STATUS_COLORS: Record<PresenceStatus, string> = {
  active: "bg-green-500",
  inactive: "bg-yellow-500",
  offline: "bg-gray-400",
};

interface StatusDotProps {
  status: PresenceStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        STATUS_COLORS[status],
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusDot.tsx
git commit -m "feat: add StatusDot component"
```

---

### Task 9: Add RBAC Guards to Server Actions

**Files:**
- Modify: `src/actions.ts`

**Interfaces:**
- Consumes: requireAdmin from rbac.tsx
- Produces: Guarded mutation functions

- [ ] **Step 1: Add requireAdmin to createCreator**

```typescript
// In src/actions.ts, modify createCreator
import { requireAdmin } from "@/lib/rbac";

export async function createCreator(input: Partial<Creator>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("creators").insert([input]);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 2: Add requireAdmin to updateCreator**

```typescript
export async function updateCreator(id: string, input: Partial<Creator>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("creators").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 3: Add requireAdmin to deleteCreator**

```typescript
export async function deleteCreator(id: string) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("creators").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 4: Add requireAdmin to all company mutations**

```typescript
export async function createCompany(input: Partial<Company>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("companies").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateCompany(id: string, input: Partial<Company>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("companies").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteCompany(id: string) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 5: Add requireAdmin to all deal mutations**

```typescript
export async function createDeal(input: Partial<Deal>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("deals").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateDeal(id: string, input: Partial<Deal>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("deals").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteDeal(id: string) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("deals").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 6: Add requireAdmin to all outreach mutations**

```typescript
export async function createOutreach(input: Partial<Outreach>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("outreach").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateOutreach(id: string, input: Partial<Outreach>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("outreach").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteOutreach(id: string) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("outreach").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 7: Add requireAdmin to all contract mutations**

```typescript
export async function createContract(input: Partial<Contract>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("contracts").insert([input]);
  if (error) fail(error);
  revalidateAll();
}

export async function updateContract(id: string, input: Partial<Contract>) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("contracts").update(input).eq("id", id);
  if (error) fail(error);
  revalidateAll();
}

export async function deleteContract(id: string) {
  await requireAdmin(); // Add this line
  const { error } = await db.from("contracts").delete().eq("id", id);
  if (error) fail(error);
  revalidateAll();
}
```

- [ ] **Step 8: Add setInvisible Server Action**

```typescript
// Add to src/actions.ts
export async function setInvisible(invisible: boolean) {
  const userId = await requireUser();
  
  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: "00000000-0000-0000-0000-000000000001",
      status_override: invisible ? "invisible" : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });
  
  if (error) fail(error);
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add src/actions.ts
git commit -m "feat: add RBAC guards to all server mutations"
```

---

### Task 10: Team Management Page

**Files:**
- Create: `src/app/settings/team/page.tsx`

**Interfaces:**
- Consumes: requireAdmin, clerkClient
- Produces: Admin-only team management page

- [ ] **Step 1: Create team management page**

```typescript
// src/app/settings/team/page.tsx
import React from "react";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage() {
  await requireAdmin();
  
  const users = await clerkClient().users.getUserList();
  
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
      <p className="mt-1 text-muted-foreground">Manage team members and their roles.</p>
      
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All users in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.data.map((user) => {
              const role = (user.publicMetadata?.role as string) || "member";
              return (
                <div key={user.id} className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                  <div className="flex items-center gap-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {role}
                    </Badge>
                    {/* Role change buttons would go here */}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/team/page.tsx
git commit -m "feat: add admin team management page"
```

---

### Task 11: Client-Side Role Hiding

**Files:**
- Modify: `src/app/master-data/page.tsx`
- Modify: `src/app/deals/page.tsx`
- Modify: `src/app/outreach/page.tsx`
- Modify: `src/app/contracts/page.tsx`

**Interfaces:**
- Consumes: useUser() from @clerk/nextjs
- Produces: Hidden/disabled write actions for members

- [ ] **Step 1: Add role check to master-data page**

```typescript
// In src/app/master-data/page.tsx
import { useUser } from "@clerk/nextjs";

export default function MasterDataPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  
  // ... existing code ...
  
  // In the JSX, wrap action buttons:
  {isAdmin && (
    <DialogTrigger asChild>
      <Button className="glass" variant="secondary">
        <Plus className="size-4" /> Add Creator
      </Button>
    </DialogTrigger>
  )}
  
  // And in the table actions column:
  {isAdmin && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      {/* ... dropdown content ... */}
    </DropdownMenu>
  )}
}
```

- [ ] **Step 2: Add role check to deals page**

```typescript
// In src/app/deals/page.tsx
import { useUser } from "@clerk/nextjs";

export default function DealsPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  
  // ... existing code ...
  
  // Wrap Add Deal button:
  {isAdmin && (
    <DialogTrigger asChild>
      <Button className="glass" variant="secondary">
        <Plus className="size-4" /> Add Deal
      </Button>
    </DialogTrigger>
  )}
  
  // Wrap table action buttons:
  {isAdmin && (
    <DropdownMenu>
      {/* ... dropdown content ... */}
    </DropdownMenu>
  )}
}
```

- [ ] **Step 3: Add role check to outreach page**

```typescript
// In src/app/outreach/page.tsx
import { useUser } from "@clerk/nextjs";

export default function OutreachPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  
  // ... existing code ...
  
  // Wrap Add Outreach button:
  {isAdmin && (
    <DialogTrigger asChild>
      <Button className="glass" variant="secondary">
        <Plus className="size-4" /> Add Outreach
      </Button>
    </DialogTrigger>
  )}
  
  // Wrap table action buttons:
  {isAdmin && (
    <DropdownMenu>
      {/* ... dropdown content ... */}
    </DropdownMenu>
  )}
}
```

- [ ] **Step 4: Add role check to contracts page**

```typescript
// In src/app/contracts/page.tsx
import { useUser } from "@clerk/nextjs";

export default function ContractsPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  
  // ... existing code ...
  
  // Wrap Add Contract button:
  {isAdmin && (
    <DialogTrigger asChild>
      <Button className="glass" variant="secondary">
        <Plus className="size-4" /> Add Contract
      </Button>
    </DialogTrigger>
  )}
  
  // Wrap table action buttons:
  {isAdmin && (
    <DropdownMenu>
      {/* ... dropdown content ... */}
    </DropdownMenu>
  )}
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/app/master-data/page.tsx src/app/deals/page.tsx src/app/outreach/page.tsx src/app/contracts/page.tsx
git commit -m "feat: hide write actions for non-admin users"
```

---

### Task 12: Update Shell with Status Dot

**Files:**
- Modify: `src/components/Shell.tsx`

**Interfaces:**
- Consumes: usePresence hook, StatusDot component
- Produces: Status dot in user profile area

- [ ] **Step 1: Add StatusDot to Shell component**

```typescript
// In src/components/Shell.tsx
import { usePresence } from "@/hooks/use-presence";
import { StatusDot } from "@/components/StatusDot";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { status } = usePresence();
  const pathname = usePathname();
  
  // ... existing code ...
  
  // In the sidebar profile section:
  <div className="flex items-center justify-between gap-2">
    <span className="text-sm text-muted-foreground">Profile</span>
    <div className="flex items-center gap-2">
      <StatusDot status={status} />
      <UserButton />
    </div>
  </div>
  
  // In the mobile profile section:
  <div className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2.5">
    <span className="text-sm text-muted-foreground">Profile</span>
    <div className="flex items-center gap-2">
      <StatusDot status={status} />
      <UserButton />
    </div>
  </div>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Shell.tsx
git commit -m "feat: add status dot to user profile in Shell"
```

---

### Task 13: Update Profile Page with Invisible Toggle

**Files:**
- Modify: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: setInvisible action
- Produces: Invisible toggle on profile page

- [ ] **Step 1: Add invisible toggle to profile page**

```typescript
// In src/app/profile/page.tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: add invisible toggle to profile page"
```

---

### Task 14: Update Seed Script with User Roles

**Files:**
- Modify: `scripts/seed.js`

**Interfaces:**
- Consumes: Clerk API
- Produces: Seeded users with roles in publicMetadata

- [ ] **Step 1: Update seed script to set user roles**

```javascript
// In scripts/seed.js, add after the seeding section
const { Clerk } = require("@clerk/backend");

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function seedUserRoles() {
  console.log("Seeding user roles...");
  
  const users = await clerk.users.getUserList();
  
  for (const user of users.data) {
    const currentRole = user.publicMetadata?.role;
    if (!currentRole) {
      // Default first user to admin, rest to member
      const role = users.data.indexOf(user) === 0 ? "admin" : "member";
      await clerk.users.updateUser(user.id, {
        publicMetadata: { role }
      });
      console.log(`Set ${user.emailAddresses[0]?.emailAddress} to ${role}`);
    }
  }
  
  console.log("User roles seeded.");
}

// Call after main seed
seed().then(() => seedUserRoles()).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify script runs without errors**

Run: `node scripts/seed.js --reset`
Expected: Users seeded with roles

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.js
git commit -m "feat: update seed script to set user roles"
```

---

### Task 15: Run Lint and Typecheck

**Files:**
- None (verification step)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Passing lint and typecheck

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and typecheck issues"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-19-rbac-presence-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?<tool_call>
<function=question>
<parameter=questions>[{"question": "How would you like to execute this implementation plan?", "header": "Execution Approach", "options": [{"label": "Subagent-Driven (Recommended)", "description": "Fresh subagent per task, review between tasks, fast iteration"}, {"label": "Inline Execution", "description": "Execute tasks in this session with batch execution and checkpoints"}]}]