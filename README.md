<div align="center">

# AniCRM

**A modern CRM built for anime creator agencies — manage creators, outreach, contracts, and brand deals in one place.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)](https://supabase.com)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk)](https://clerk.com)

</div>

---

## What is AniCRM?

AniCRM is a full-featured CRM tailored for **anime content creator agencies**. It replaces spreadsheet-based workflows with a proper web application that manages the entire lifecycle:

**Prospect** creators -> **Reach out** -> **Negotiate** contracts -> **Sign** brand deals -> **Track** campaigns and payments.

Whether you're scouting cosplay creators on Instagram or managing a multi-creator brand deal with an agency commission, AniCRM gives your team a single source of truth.

---

## Features

### Creator Management
- Full CRUD for anime content creators with 25+ fields (social handles, followers, engagement rates, niche, location, payment details)
- Read-only **Creators** table for browsing, plus a spreadsheet-like **Master Data** view for admins
- Individual creator detail pages with linked outreach, contracts, and deals

### Brand Deal Pipeline
- Multi-creator deals with company associations
- Campaign status tracking (Pitched -> Confirmed -> In Progress -> Completed -> Cancelled)
- Invoice and payment status tracking
- Deal value and agency commission calculations
- Due dates and completion dates

### Outreach Tracking
- Per-creator contact history with method, dates, and follow-up scheduling
- Status workflow: No Response -> Awaiting Reply -> Interested -> Negotiating -> Signed
- Outcome tracking: Pending, Signed, Rejected, No Response

### Contract Management
- Contract types: Exclusive Management, Non-Exclusive, Brand Deal Only, Project-Based, Ambassadorship
- Status lifecycle: Draft -> Active -> Renewed -> Expired / Terminated
- Exclusivity tracking and renewal reminders

### Company Profiles
- Brand/company profiles with industry, domain, and logo
- Contact people per company with POC (Point of Contact) designation
- Last contacted and next meeting dates

### Social Pages View
- Aggregated view of all creator social media pages across platforms
- Follower counts, engagement rates, and deal values per page
- Filterable by platform (Instagram, YouTube, X/Twitter)

### Dashboard Analytics
- Pipeline overview with stat cards (prospects, contacted, negotiating, signed, deals, revenue)
- Donut charts for creator pipeline by status and deals by campaign status
- Top creators ranking by deal value
- Recent outreach activity feed
- Filterable via saved custom filters

### Admin-Editable Dropdown Options
- All 13 enum/dropdown fields across the app are admin-manageable from **Settings > Dropdown Options**
- Add, rename (cascades to existing records), or remove values
- Removing a value still in use is blocked with a count of affected records

### Custom Filters
- Save personal or workspace-wide filter presets
- Complex conditions with text, number, enum, and date operators
- Apply filters across Dashboard, Creators, and Master Data views

### Role-Based Access Control (RBAC)
- Three roles: **Admin**, **Member**, **Viewer**
- Server-side enforcement via Clerk JWT metadata + Supabase Row Level Security
- Client-side UI hiding of write actions for non-admins
- Admin-only team management at `/settings/team`

### Presence System
- Discord-style user status (Active, Inactive, Offline, Invisible)
- Manual status selector in the sidebar

### Theme
- Light and dark mode with localStorage persistence
- Flash-free loading via inline script

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16.3](https://nextjs.org) (App Router, Turbopack) |
| Language | [TypeScript 5](https://typescriptlang.org) (strict mode) |
| UI Library | [React 19](https://react.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Components | [Radix UI](https://www.radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) pattern |
| Charts | [Recharts 3](https://recharts.org) |
| Auth | [Clerk](https://clerk.com) (sessions, RBAC, organizations) |
| Database | [Supabase](https://supabase.com) (PostgreSQL, RLS) |
| Icons | [Lucide React](https://lucide.dev) |
| Toasts | [Sonner](https://sonner.emilkowal.ski) |

---

## Project Structure

```
anime-agency-crm/
├── db/
│   └── schema.sql                  # Full Supabase schema (all tables, RLS, indexes)
├── scripts/
│   └── seed.js                     # Dev data seeder
└── src/
    ├── actions.ts                  # All server actions (CRUD for every entity)
    ├── proxy.ts                    # Clerk middleware (auth + RBAC route protection)
    ├── app/
    │   ├── layout.tsx              # Root layout (ClerkProvider + Shell)
    │   ├── page.tsx                # Home -> redirects to /dashboard
    │   ├── dashboard/page.tsx      # Analytics dashboard with charts
    │   ├── master-data/page.tsx    # Full CRUD spreadsheet view
    │   ├── creators/
    │   │   ├── page.tsx            # Creators list (read-only)
    │   │   └── [id]/page.tsx       # Creator detail + linked records
    │   ├── companies/page.tsx      # Companies CRUD
    │   ├── pages/page.tsx          # Social pages aggregation
    │   ├── deals/page.tsx          # Deals CRUD (multi-creator)
    │   ├── outreach/page.tsx       # Outreach CRUD
    │   ├── contracts/page.tsx      # Contracts CRUD
    │   ├── profile/page.tsx        # User profile
    │   ├── settings/
    │   │   ├── layout.tsx          # Settings sub-navigation
    │   │   ├── page.tsx            # General settings
    │   │   ├── team/page.tsx       # Team member management (admin)
    │   │   ├── dropdowns/page.tsx  # Dropdown options editor (admin)
    │   │   ├── appearance/page.tsx # Theme toggle
    │   │   ├── filters/page.tsx    # Custom filter management
    │   │   └── notifications/      # Notification preferences
    │   ├── sign-in/[[...rest]]/    # Clerk sign-in
    │   └── sign-up/[[...rest]]/    # Clerk sign-up
    ├── components/
    │   ├── Shell.tsx               # App shell (sidebar + mobile nav)
    │   ├── creator-form.tsx        # Reusable creator form
    │   ├── DashboardCharts.tsx     # Recharts donut charts
    │   ├── enum-select.tsx         # Shared dynamic dropdown component
    │   ├── custom-filter-picker.tsx# Filter picker for views
    │   └── ui/                     # shadcn/ui primitives
    └── lib/
        ├── server.ts               # Supabase client (service role)
        ├── rbac-server.ts          # Server-side RBAC helpers
        ├── rbac.tsx                # Client-side RBAC hooks
        ├── types.ts                # TypeScript entity types
        ├── dropdown-options.ts     # Dropdown field definitions and defaults
        ├── use-dropdown-options.ts # Client hook for dynamic dropdown data
        ├── custom-filters.ts       # Filter evaluation engine
        ├── colors.ts               # Badge/status color mappings
        └── utils.ts                # cn() utility
```

---

## Database Schema

AniCRM uses **12 Supabase tables** with Row Level Security:

| Table | Purpose |
|-------|---------|
| `users` | Mirror of Clerk users with roles (admin/member/viewer) |
| `creators` | Anime content creators (master data) |
| `outreach` | Communication/contact history per creator |
| `contracts` | Management contracts with creators |
| `companies` | Brand/company profiles |
| `company_contacts` | Contact people per company |
| `deals` | Brand deals with campaign and financial tracking |
| `deal_creators` | Many-to-many: deals <-> creators |
| `workspaces` | Workspace support (future-proofed) |
| `user_status` | Presence/status tracking |
| `user_preferences` | Per-user notification preferences |
| `custom_filters` | Saved filter presets |
| `dropdown_options` | Admin-editable enum values (13 field keys) |

---

## Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- A **Supabase** project
- A **Clerk** application

### 1. Clone the repository

```bash
git clone https://github.com/km-kurisu/ACRM.git
cd ACRM
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard > API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard > API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API |

### 4. Configure Clerk

In the **Clerk Dashboard**:

1. Go to **Sessions** > **Token** and add `"metadata": "{{user.public_metadata}}"` to the session token template
2. Set up **Supabase** as a native third-party auth provider (so Clerk JWTs work with Supabase RLS)

### 5. Set up the database

Run the schema in the **Supabase SQL Editor**:

1. Open `db/schema.sql`
2. Copy the entire contents
3. Paste into Supabase Dashboard > SQL Editor > New query > Run

This creates all tables, RLS policies, indexes, and default data. Safe to re-run (idempotent).

### 6. Seed dev data (optional)

```bash
npm run seed
```

This populates sample creators, companies, deals, outreach records, and contracts.

To reset and reseed:

```bash
npm run seed -- --reset
```

### 7. Set the first admin

The first user to sign up needs the `admin` role. Either:

- Run the seed script (it assigns admin to the configured user), or
- Manually set `publicMetadata.role = "admin"` in the Clerk Dashboard for your user

---

## Running

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at [localhost:3000](http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed dev data |

---

## Roles and Permissions

| Action | Admin | Member | Viewer |
|--------|-------|--------|--------|
| View all entities | Yes | Yes | Yes |
| Create / Edit records | Yes | Yes | No |
| Delete records | Yes | No | No |
| Manage settings | Yes | No | No |
| Manage team members | Yes | No | No |
| Edit dropdown options | Yes | No | No |

Enforcement happens at three levels:
1. **Server Actions** - `requireAdmin()` checks Clerk JWT metadata
2. **Database** - Supabase RLS policies restrict writes to admin role
3. **Client UI** - Write buttons/forms hidden for non-admins (cosmetic, not security)

---

## Customization

### Dropdown Options

Admins can manage all enum values from **Settings > Dropdown Options**. This covers creator types, niches, priorities, statuses, contract types, and more. Changes cascade to existing records on rename.

### Custom Filters

Create saved filter presets from the **Creators** or **Master Data** pages, then manage them at **Settings > Filters**. Filters can be personal or shared with the entire workspace.

### Theme

Toggle between light and dark mode from the sidebar or **Settings > Appearance**.

---

## License

This project is private and proprietary.
