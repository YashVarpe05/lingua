# Supabase Leaderboard Setup

The app stores learning progress locally, but the weekly/all-time leaderboard uses Supabase through authenticated Expo API routes.

## Environment

Use the Supabase pooler connection string for local development so machines without IPv6 can connect:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key_here
DATABASE_URL=postgresql://postgres.your-project-ref:your-db-password@aws-1-your-region.pooler.supabase.com:5432/postgres
# Recommended for strict backend QA TLS verification:
# DATABASE_SSL_CA_PATH=./certs/supabase-ca.pem
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in client code.
If local `npm run qa:backend` fails with a certificate-chain error, download
your Supabase database CA certificate and set `DATABASE_SSL_CA_PATH`,
`DATABASE_SSL_CA`, or `PGSSLROOTCERT`. As a local-only fallback,
`DATABASE_SSL_REJECT_UNAUTHORIZED=false` can unblock QA on that machine, but it
must not be used when `API_BASE_URL` points at a deployed app.

If the Supabase project URL does not resolve, open the Supabase dashboard and
make sure the project is active. Paused or inactive projects can make both
`https://<project-ref>.supabase.co` and the pooler connection reject otherwise
well-formed environment values.

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
grant select, insert, update, delete on table public.leaderboard to service_role;

drop policy if exists "Service role can read leaderboard" on public.leaderboard;
create policy "Service role can read leaderboard"
  on public.leaderboard
  for select
  to service_role
  using (true);

drop policy if exists "Service role can add leaderboard rows" on public.leaderboard;
create policy "Service role can add leaderboard rows"
  on public.leaderboard
  for insert
  to service_role
  with check (true);

drop policy if exists "Service role can update leaderboard rows" on public.leaderboard;
create policy "Service role can update leaderboard rows"
  on public.leaderboard
  for update
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role can delete leaderboard rows" on public.leaderboard;
create policy "Service role can delete leaderboard rows"
  on public.leaderboard
  for delete
  to service_role
  using (true);

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end $$;

comment on table public.leaderboard is
  'Server-managed XP leaderboard rows keyed by verified Clerk user id.';
```

This keeps direct mobile Supabase access closed. The Expo API routes use Clerk auth first, then the server-only Supabase service role performs the leaderboard reads and writes.

## Verification

With Expo running on port `8081`, run:

```bash
npm run auth:check
npm run qa:backend
```

If Expo is running somewhere else, set `API_BASE_URL` before running the checks.
Make sure the same origin is listed in `CLERK_AUTHORIZED_PARTIES`, otherwise
signed-in API calls can be rejected even though the app appears signed in.

Expected behavior:

- Protected API routes return `401` without a Clerk token.
- `/api/leaderboard/migrate` returns `404`.
- RLS is enabled and the service-role leaderboard policies exist.
- If `public.rls_auto_enable()` exists, `PUBLIC`, `anon`, and `authenticated` cannot execute it.
- The service role can insert, update, select, and delete leaderboard rows.
- The publishable key cannot directly read or write leaderboard rows.
