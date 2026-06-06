# Supabase Leaderboard Setup

The app stores learning progress locally, but the weekly/all-time leaderboard uses Supabase through authenticated Expo API routes.

## Environment

Use the Supabase pooler connection string for local development so machines without IPv6 can connect:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key_here
DATABASE_URL=postgresql://postgres.your-project-ref:your-db-password@aws-1-your-region.pooler.supabase.com:5432/postgres
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in client code.

## SQL

Run this in the Supabase SQL Editor or through a trusted admin SQL tool:

```sql
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  display_name text not null,
  avatar_url text,
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  week_start date not null default (date_trunc('week', now())::date),
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_weekly_xp_idx
  on public.leaderboard (weekly_xp desc);

create index if not exists leaderboard_total_xp_idx
  on public.leaderboard (total_xp desc);

create index if not exists leaderboard_week_start_weekly_xp_idx
  on public.leaderboard (week_start, weekly_xp desc);

alter table public.leaderboard enable row level security;

revoke all on table public.leaderboard from anon;
revoke all on table public.leaderboard from authenticated;
grant select, insert, update on table public.leaderboard to service_role;

comment on table public.leaderboard is
  'Server-managed XP leaderboard rows keyed by verified Clerk user id.';
```

## Verification

With Expo running on port `8081`, run:

```bash
npm run auth:check
npm run qa:backend
```

Expected behavior:

- Protected API routes return `401` without a Clerk token.
- `/api/leaderboard/migrate` returns `404`.
- The service role can insert, update, select, and delete leaderboard rows.
- The publishable key cannot directly read leaderboard rows.
