# Replace Heartbeat Presence with Manual Status Selector

## Context

The current presence system sends automatic heartbeat POST requests every 60 seconds to `/api/presence/heartbeat`, which is causing 500 errors and overloading the server. The user wants to replace this with a manual dropdown selector where users explicitly choose their status.

## Current State

- **4 statuses**: Active, Inactive, Offline, Invisible
- `status_override` in `user_status` table stores `null` or `"invisible"`
- Heartbeat hits Supabase every 60s per user via `updateLastActive()`
- `getEffectiveStatus()` computes status from `status_override` + time-based logic

## Changes

### 1. Expand `PresenceStatus` type (`src/lib/presence.ts`)
- Add `"invisible"` to the `PresenceStatus` union type
- Update `getEffectiveStatus()` to return the override directly when set (no time-based computation needed for manual selection)

### 2. Replace server action (`src/actions.ts`)
- Replace `setInvisible(invisible: boolean)` with `setPresenceStatus(status: PresenceStatus)` that stores the selected status in `status_override`

### 3. Create `StatusSelector` component (`src/components/StatusSelector.tsx`)
- Dropdown using the existing `Select` UI component
- 4 options: Active, Inactive, Offline, Invisible
- Each option has a colored dot indicator
- Calls `setPresenceStatus` on change

### 4. Update Shell (`src/components/Shell.tsx`)
- Replace `StatusDot` + `usePresence` with `StatusSelector` in desktop sidebar and mobile menu
- Remove `use-presence` import (no longer needed here)

### 5. Remove heartbeat infrastructure
- Delete `src/app/api/presence/heartbeat/route.ts`
- Delete `src/hooks/use-presence.ts`

### 6. Update profile page (`src/app/profile/invisible` button → dropdown)
- Replace the toggle button with `StatusSelector`

### 7. Update GET presence endpoint (`src/app/api/presence/route.ts`)
- Simplify to just read `status_override` from DB directly (no time-based logic needed)

## Verification

- `npm run build` passes
- No more heartbeat requests in network tab
- Dropdown appears in sidebar, selecting a status persists to DB
- Profile page shows the same dropdown
