# RBAC & Presence System Design Spec

**Date:** 2026-08-19  
**Status:** Approved  
**Features:** RBAC (admin/member/viewer) + User Activity Status

---

## Overview

This spec covers two major features for the AnimeCRM application:

1. **RBAC System** - Role-based access control with admin, member, and viewer roles
2. **Presence System** - Discord-style user activity status (active/inactive/offline/invisible)

---

## Feature 1: RBAC System

### Requirements

- Roles: `admin`, `member`, `viewer` (extending existing 3-role system)
- Store role in Clerk `publicMetadata.role`
- Type via `types/globals.d.ts` with `CustomJwtSessionClaims.metadata.role`
- Configure Clerk session token to include `"metadata": "{{user.public_metadata}}"`
- Middleware redirects members away from admin-only routes
- Server-side helpers `requireAdmin()` and `requireUser()` for Server Actions
- Audit all mutations across Companies, Deals, Outreach, Contracts, Creators
- Set up Clerk as native third-party auth provider for Supabase
- RLS policies: SELECT for authenticated, INSERT/UPDATE/DELETE for admin
- Admin-only team management page at `/settings/team`
- Client-side: hide/disable write actions for members (cosmetic only)

### Implementation

#### Files to Create/Modify

1. **`types/globals.d.ts`** (new)
   ```typescript
   declare global {
     namespace CustomJwtSessionClaims {
       interface Metadata {
         role?: "admin" | "member" | "viewer";
       }
     }
   }
   ```

2. **`src/middleware.ts`** (new)
   - Import `clerkMiddleware` and `createRouteMatcher`
   - Define admin-only routes: `/settings/team`, `/admin/*`
   - Check `sessionClaims.metadata.role` for access control
   - Redirect non-admins to `/dashboard`

3. **`src/lib/rbac.tsx`** (modify)
   - Add `requireAdmin()` - throws UNAUTHENTICATED/FORBIDDEN
   - Add `requireUser()` - throws UNAUTHENTICATED
   - Keep existing client-side hooks and guards

4. **`src/actions.ts`** (modify)
   - Add `await requireAdmin()` to all mutation functions:
     - `createCreator`, `updateCreator`, `deleteCreator`
     - `createCompany`, `updateCompany`, `deleteCompany`
     - `createDeal`, `updateDeal`, `deleteDeal`
     - `createOutreach`, `updateOutreach`, `deleteOutreach`
     - `createContract`, `updateContract`, `deleteContract`

5. **`db/schema.sql`** (modify)
   - Update RLS policies to check Clerk JWT role:
     ```sql
     CREATE POLICY "table_insert_admin" ON public.table
       FOR INSERT WITH CHECK (
         auth.uid() IS NOT NULL AND
         (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
       );
     ```
   - Apply to: creators, outreach, contracts, companies, deals, users

6. **`src/lib/server.ts`** (modify)
   - Add `createAuthenticatedClient()` function
   - Uses Clerk `auth().getToken()` with Supabase template
   - Returns Supabase client with user's JWT for RLS

7. **`src/app/settings/team/page.tsx`** (new)
   - Admin-only page (guarded by `requireAdmin()`)
   - Lists all users via `clerkClient().users.getUserList()`
   - `setRole` Server Action to update user's `publicMetadata.role`

8. **Client-side pages** (modify)
   - Hide/disable edit/delete buttons based on `useUser().publicMetadata.role`
   - Cosmetic only, not security boundary

9. **`scripts/seed.js`** (modify)
   - Update seeded users with roles in `publicMetadata`

### Manual Steps Required

1. **Clerk Dashboard Configuration:**
   - Go to Sessions → Configure → Custom session claims
   - Add: `"metadata": "{{user.public_metadata}}"`
   - This ensures role is included in session JWT

2. **Supabase Third-Party Auth Setup:**
   - Go to Authentication → Providers → Third-party auth
   - Add Clerk as a provider
   - Configure JWT verification with Clerk's JWKS endpoint

3. **Create Team Management Page Route:**
   - Ensure `/settings/team` is accessible only to admins

---

## Feature 2: Presence System

### Requirements

- Four states: `active`, `inactive`, `offline`, `invisible`
- DB: `user_status` table keyed by (user_id, workspace_id)
- `workspace_id` references `workspaces` table (future-proof for multi-workspace)
- Seed/default single "default" workspace row
- `status_override`: 'active' | 'inactive' | 'invisible' | null (null = auto-detect)
- `last_active_at`: updated on heartbeat/interaction
- Supabase Realtime Presence, one channel per workspace_id
- Client heartbeat hook (60s interval, immediate on visibility change)
- Idle detection: flip to 'inactive' after 10 minutes
- Toggle "Appear invisible" from profile menu
- Status dot UI: green (active), yellow (inactive), gray (offline)

### Implementation

#### Files to Create/Modify

1. **`db/schema.sql`** (modify)
   ```sql
   -- Workspaces table
   CREATE TABLE IF NOT EXISTS public.workspaces (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL DEFAULT 'default',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   -- Seed default workspace
   INSERT INTO public.workspaces (id, name) VALUES 
     ('00000000-0000-0000-0000-000000000001', 'default')
   ON CONFLICT DO NOTHING;

   -- User status table
   CREATE TABLE IF NOT EXISTS public.user_status (
     user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
     status_override TEXT CHECK (status_override IN ('active', 'inactive', 'invisible')),
     last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (user_id, workspace_id)
   );

   -- RLS for user_status
   ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "user_status_select_authenticated" ON public.user_status
     FOR SELECT USING (auth.uid() IS NOT NULL);
   CREATE POLICY "user_status_insert_own" ON public.user_status
     FOR INSERT WITH CHECK (auth.uid()::text = user_id);
   CREATE POLICY "user_status_update_own" ON public.user_status
     FOR UPDATE USING (auth.uid()::text = user_id);
   ```

2. **`src/hooks/use-presence.ts`** (new)
   - Listens for mouse/keyboard/visibility changes
   - Pings `last_active_at` every 60s while active
   - Immediate ping on `visibilitychange` to 'visible'
   - Flips local state to 'inactive' after 10 minutes of no interaction
   - Uses Supabase Realtime Presence for online/offline detection

3. **`src/lib/presence.ts`** (new)
   - Server-side presence utilities
   - `getEffectiveStatus()` function for display logic
   - `updateUserStatus()` Server Action

4. **`src/components/StatusDot.tsx`** (new)
   - Colored dot component: green (active), yellow (inactive), gray (offline)
   - Accepts `status` prop and `className`

5. **`src/components/Shell.tsx`** (modify)
   - Add status dot next to user profile area

6. **`src/app/profile/page.tsx`** (modify)
   - Add "Appear invisible" toggle
   - Calls `setInvisible` Server Action

7. **`src/actions.ts`** (modify)
   - Add `setInvisible` Server Action
   - Guarded by `requireUser()`
   - Updates `user_status.status_override` for current user

### Effective Status Logic

```typescript
function getEffectiveStatus(
  statusOverride: string | null,
  isOnline: boolean,
  lastActiveAt: Date,
  currentUserId: string,
  viewerUserId: string
): 'active' | 'inactive' | 'offline' {
  if (statusOverride === 'invisible') {
    return currentUserId === viewerUserId ? 'active' : 'offline';
  }
  if (!isOnline) return 'offline';
  if (Date.now() - lastActiveAt.getTime() > 10 * 60 * 1000) return 'inactive';
  return 'active';
}
```

### Manual Steps Required

1. **Supabase Realtime Enablement:**
   - Go to Database → Replication
   - Enable Realtime for `user_status` table

2. **Run Database Migration:**
   - Execute the SQL changes in `db/schema.sql` via Supabase SQL Editor

---

## File Change Summary

### New Files
- `types/globals.d.ts`
- `src/middleware.ts`
- `src/app/settings/team/page.tsx`
- `src/hooks/use-presence.ts`
- `src/lib/presence.ts`
- `src/components/StatusDot.tsx`
- `docs/superpowers/specs/2026-08-19-rbac-presence-design.md`

### Modified Files
- `src/lib/rbac.tsx`
- `src/actions.ts`
- `db/schema.sql`
- `src/lib/server.ts`
- `src/components/Shell.tsx`
- `src/app/profile/page.tsx`
- `scripts/seed.js`

### Unchanged Files
- `src/app/dashboard/page.tsx`
- `src/app/master-data/page.tsx`
- `src/app/deals/page.tsx`
- `src/app/outreach/page.tsx`
- `src/app/contracts/page.tsx`
- `src/components/ui/*` (all UI components)

---

## Testing Strategy

1. **RBAC Testing:**
   - Create test users with different roles
   - Verify admin can perform all mutations
   - Verify member/viewer cannot perform mutations
   - Verify middleware blocks non-admins from admin routes
   - Verify RLS policies enforce role-based access

2. **Presence Testing:**
   - Test heartbeat interval (60s)
   - Test idle detection (10min timeout)
   - Test invisible mode toggle
   - Test status dot display across different states
   - Test Supabase Realtime Presence connection/disconnection

---

## Dependencies

- `@clerk/nextjs` v7 (already installed)
- `@supabase/supabase-js` (already installed)
- `@clerk/backend` (for `clerkClient` in server components)

---

## Risks & Mitigations

1. **Risk:** Clerk JWT template configuration may fail
   - **Mitigation:** Clear documentation, fallback to service role key for server operations

2. **Risk:** Realtime Presence may have latency issues
   - **Mitigation:** Client-side idle detection as primary mechanism, Realtime as supplement

3. **Risk:** RLS policies may break existing functionality
   - **Mitigation:** Test thoroughly with existing data, rollback plan ready

---

## Next Steps

1. Write implementation plan using `writing-plans` skill
2. Execute plan with review checkpoints
3. Verify with lint and typecheck commands
4. Manual steps documentation for user
