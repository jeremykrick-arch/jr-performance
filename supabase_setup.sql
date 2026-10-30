-- Run in your own Supabase project's SQL editor before enabling optional cloud sync.
-- Parent-controlled Supabase Auth account required.
create table if not exists public.jr_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.jr_backups enable row level security;
revoke all on public.jr_backups from anon;
grant select,insert,update,delete on public.jr_backups to authenticated;
create policy "Parents read own backup" on public.jr_backups for select to authenticated using (auth.uid() = user_id);
create policy "Parents create own backup" on public.jr_backups for insert to authenticated with check (auth.uid() = user_id);
create policy "Parents update own backup" on public.jr_backups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Parents delete own backup" on public.jr_backups for delete to authenticated using (auth.uid() = user_id);
