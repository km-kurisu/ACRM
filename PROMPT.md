I need two features added to my Next.js 16 + Clerk (@clerk/nextjs v7) + Supabase CRM
(repo: km-kurisu/ACRM). Read the existing codebase structure first (src/, db/, scripts/seed.js)
before making changes, and match existing conventions (shadcn components, zod validation,
zustand for client state where used).

=== FEATURE 1: RBAC (admin / member) ===

Roles: "admin" (full read/write/delete on all data) and "member" (read-only).

1. Store role in Clerk publicMetadata.role, typed via types/globals.d.ts
   (CustomJwtSessionClaims.metadata.role: 'admin' | 'member').
2. Configure the Clerk session token to include `"metadata": "{{user.public_metadata}}"`
   and document that this needs to be set in the Clerk Dashboard under Sessions.
3. middleware.ts: redirect members away from any admin-only routes (e.g. /settings/team,
   /admin/*) using sessionClaims.metadata.role.
4. src/lib/rbac.ts: requireAdmin() and requireUser() helpers that throw on
   UNAUTHENTICATED / FORBIDDEN, for use in Server Actions and Route Handlers.
5. Audit every existing mutation (create/update/delete) across Companies, Deals, and any
   other module — make sure it's a Server Action or Route Handler (not a client-side
   supabase-js call with the anon key), and call requireAdmin() at the top of each one
   before touching Supabase. Reads stay open to any authenticated user.
6. Set up Clerk as a native third-party auth provider for Supabase (not the deprecated
   JWT template) so the Clerk session JWT works directly with Supabase Auth.
7. Write RLS policies for every table: SELECT allowed for any authenticated user, INSERT/
   UPDATE/DELETE restricted to (auth.jwt() -> 'metadata' ->> 'role') = 'admin'.
8. src/app/(dashboard)/settings/team/: an admin-only page listing all users (via
   clerkClient().users.getUserList()) with a control to set each user's role
   (setRole Server Action, guarded by requireAdmin()).
9. Client-side: hide/disable write actions (edit/delete buttons, forms) for members using
   useUser().user.publicMetadata.role — cosmetic only, not the security boundary.
10. Update scripts/seed.js so seeded/test users get a role in publicMetadata.

=== FEATURE 2: User activity status ===

Add a presence system with four states, same model as Discord:
- active    — user has the app open and has interacted recently
- inactive  — app open/tab open but no interaction for 10 minutes
- offline   — no live connection (app closed, tab closed, disconnected)
- invisible — user manually sets this; appears "offline" to everyone else regardless of
              actual activity, but the user still has a normal active session underneath

The CRM is single-org today, but future-proof the schema for multi-workspace support later
(don't build workspace switching now — just don't hardcode assumptions that block it).

Requirements:
1. DB: a `user_status` table keyed by (user_id, workspace_id), with:
   - workspace_id: uuid, references a `workspaces` table. For now, seed/default a single
     "default" workspace row and assign all users to it, so the schema is ready for
     multiple workspaces without requiring a migration later.
   - status_override: 'active' | 'inactive' | 'invisible' | null   (null = auto-detect)
   - last_active_at: timestamptz, updated on heartbeat/interaction
   - updated_at: timestamptz
   - unique constraint on (user_id, workspace_id)
   Effective status for display =
     - if status_override = 'invisible' -> show 'offline' to others, but the user's own
       client still knows they're really active
     - else if no live realtime connection -> 'offline'
     - else if now() - last_active_at > 10 minutes -> 'inactive'
     - else -> 'active'
2. Use Supabase Realtime Presence, one channel per workspace_id (even though there's only
   one workspace today) — this gives "offline" for free on disconnect, and means the
   channel scoping already works when multiple workspaces exist.
3. Client: a heartbeat hook that listens for interaction (mouse/keyboard/visibility change)
   and pings last_active_at at a throttled interval (~60s while active, immediately on
   visibilitychange to 'visible').
4. Idle detection: flip local state to 'inactive' after 10 minutes of no interaction, via
   Page Visibility API + debounced activity listener — no constant polling.
5. Let each user toggle "Appear invisible" from their profile/account menu — writes
   status_override via a Server Action scoped to (userId, current workspace_id), guarded
   by requireUser() (any authenticated user can set their own status).
6. UI: a colored status dot next to user avatars/names throughout the CRM (team list,
   activity feed, etc.) reflecting the *effective* status as seen by others — green
   (active), yellow (inactive), gray (offline). Invisible always renders gray to everyone
   except the user themselves.


For both features: use TypeScript throughout, follow the existing file structure and
naming conventions in the repo, and don't touch unrelated code. After implementing,
list which files you changed and flag anything that needs a manual step on my end
(e.g. Clerk Dashboard config, Supabase Third-Party Auth setup) since those can't be
done from code.