-- OFFSZN v8.46 — execute in Supabase SQL Editor before cloud backups.
create table if not exists public.athlete_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 age integer check (age between 13 and 18),
 baseball_role text,
 created_at timestamptz not null default now()
);
alter table public.athlete_profiles enable row level security;
grant select,insert,update,delete on public.athlete_profiles to authenticated;
drop policy if exists athlete_own_select on public.athlete_profiles;
create policy athlete_own_select on public.athlete_profiles for select to authenticated using (auth.uid()=user_id);
drop policy if exists athlete_own_insert on public.athlete_profiles;
create policy athlete_own_insert on public.athlete_profiles for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists athlete_own_update on public.athlete_profiles;
create policy athlete_own_update on public.athlete_profiles for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.jr_backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.jr_backups enable row level security;
grant select,insert,update,delete on public.jr_backups to authenticated;
drop policy if exists backups_own_select on public.jr_backups;
create policy backups_own_select on public.jr_backups for select to authenticated using (auth.uid()=user_id);
drop policy if exists backups_own_insert on public.jr_backups;
create policy backups_own_insert on public.jr_backups for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists backups_own_update on public.jr_backups;
create policy backups_own_update on public.jr_backups for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
