-- OFFSZN v8.59: Run after SUPABASE_SETUP.sql and SUPABASE_FAMILY_LINKING_v857.sql.
-- Atomic revision checks prevent one device silently overwriting another.
create table if not exists public.offszn_athlete_sync (
 athlete_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null, revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.offszn_athlete_sync enable row level security;
revoke all on public.offszn_athlete_sync from anon,authenticated;
create or replace function public.offszn_sync_read()
returns table(payload jsonb, revision bigint, updated_at timestamptz)
language sql security definer set search_path='' as $$
 select s.payload,s.revision,s.updated_at from public.offszn_athlete_sync s
 where s.athlete_id=auth.uid() and exists(select 1 from public.offszn_account_roles r where r.user_id=auth.uid() and r.role='athlete');
$$;
create or replace function public.offszn_sync_write(expected_revision bigint,new_payload jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare result bigint;begin
 if auth.uid() is null or not exists(select 1 from public.offszn_account_roles where user_id=auth.uid() and role='athlete') then raise exception 'Athlete authentication required';end if;
 if jsonb_typeof(new_payload)<>'object' or not (new_payload ? 'sessions' and new_payload ? 'tests') then raise exception 'Invalid snapshot';end if;
 if pg_column_size(new_payload)>2097152 then raise exception 'Snapshot exceeds 2 MB limit';end if;
 if expected_revision=0 then
  insert into public.offszn_athlete_sync(athlete_id,payload,revision) values(auth.uid(),new_payload,1) on conflict do nothing returning revision into result;
 else
  update public.offszn_athlete_sync set payload=new_payload,revision=revision+1,updated_at=now()
  where athlete_id=auth.uid() and revision=expected_revision returning revision into result;
 end if;
 if result is null then raise exception 'revision conflict: reload cloud data before continuing';end if;
 return result;
end $$;
revoke all on function public.offszn_sync_read() from public,anon;
revoke all on function public.offszn_sync_write(bigint,jsonb) from public,anon;
grant execute on function public.offszn_sync_read() to authenticated;
grant execute on function public.offszn_sync_write(bigint,jsonb) to authenticated;
