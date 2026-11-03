-- OFFSZN v8.57 family links: run AFTER SUPABASE_SETUP.sql.
-- Parent/athlete roles are snapshotted at account creation. Client metadata updates
-- cannot elevate an existing account. Does NOT verify parental identity or consent.
create extension if not exists pgcrypto;
create table if not exists public.offszn_account_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('parent','athlete')),
 created_at timestamptz not null default now()
);
alter table public.offszn_account_roles enable row level security;
revoke all on public.offszn_account_roles from anon,authenticated;
create or replace function public.offszn_on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data->>'role' in ('parent','athlete') then
  insert into public.offszn_account_roles(user_id,role) values(new.id,new.raw_user_meta_data->>'role') on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists offszn_new_user_role on auth.users;
create trigger offszn_new_user_role after insert on auth.users for each row execute function public.offszn_on_auth_user_created();
-- Backfill accounts created before the migration. Verify roles manually if needed.
insert into public.offszn_account_roles(user_id,role)
select id,raw_user_meta_data->>'role' from auth.users
where raw_user_meta_data->>'role' in ('parent','athlete') on conflict do nothing;
create table if not exists public.offszn_family_invites (
 id uuid primary key default gen_random_uuid(), athlete_id uuid not null references auth.users(id) on delete cascade,
 code_hash text not null unique, expires_at timestamptz not null,
 used_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.offszn_family_links (
 id uuid primary key default gen_random_uuid(), parent_id uuid not null references auth.users(id) on delete cascade,
 athlete_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 created_at timestamptz not null default now(), decided_at timestamptz,
 unique(parent_id,athlete_id), check(parent_id<>athlete_id)
);
alter table public.offszn_family_invites enable row level security;
alter table public.offszn_family_links enable row level security;
revoke all on public.offszn_family_invites,public.offszn_family_links from anon,authenticated;
create or replace function public.offszn_create_parent_invite() returns text language plpgsql security definer set search_path='' as $$
declare code text;begin
 if not exists(select 1 from public.offszn_account_roles where user_id=auth.uid() and role='athlete') then raise exception 'Athlete sign-in required';end if;
 -- 8 hex characters (32 bits); rate limiting should be added before public release.
 code:=upper(encode(extensions.gen_random_bytes(4),'hex'));
 insert into public.offszn_family_invites(athlete_id,code_hash,expires_at) values(auth.uid(),encode(extensions.digest(code,'sha256'),'hex'),now()+interval '24 hours');
 return code;
end $$;
create or replace function public.offszn_request_parent_link(invite_code text) returns void language plpgsql security definer set search_path='' as $$
declare aid uuid;begin
 if not exists(select 1 from public.offszn_account_roles where user_id=auth.uid() and role='parent') then raise exception 'Parent sign-in required';end if;
 if invite_code !~ '^[A-F0-9]{8}$' then raise exception 'Invalid invitation code';end if;
 update public.offszn_family_invites set used_at=now()
 where id=(select id from public.offszn_family_invites where code_hash=encode(extensions.digest(invite_code,'sha256'),'hex') and expires_at>now() and used_at is null for update skip locked limit 1)
 returning athlete_id into aid;
 if aid is null then raise exception 'Code expired or already used';end if;
 insert into public.offszn_family_links(parent_id,athlete_id,status) values(auth.uid(),aid,'pending')
 on conflict(parent_id,athlete_id) do update set status='pending',decided_at=null;
end $$;
create or replace function public.offszn_decide_parent_link(link_id uuid,approve boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.offszn_family_links set status=case when approve then 'approved' else 'declined' end,decided_at=now()
 where id=link_id and athlete_id=auth.uid() and status='pending';
 if not found then raise exception 'Pending request not found';end if;
end $$;
create or replace function public.offszn_unlink_parent(link_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.offszn_family_links where id=link_id and status='approved' and (parent_id=auth.uid() or athlete_id=auth.uid());
 if not found then raise exception 'Link not found';end if;
end $$;
create or replace function public.offszn_list_family_links() returns table(id uuid,status text,counterpart_email text) language sql security definer set search_path='' as $$
 select l.id,l.status,coalesce(u.email,'Account')::text from public.offszn_family_links l
 join auth.users u on u.id=case when l.parent_id=auth.uid() then l.athlete_id else l.parent_id end
 where (l.parent_id=auth.uid() or l.athlete_id=auth.uid()) and l.status in ('pending','approved')
 order by l.created_at desc;
$$;
revoke all on function public.offszn_create_parent_invite(),public.offszn_request_parent_link(text),public.offszn_decide_parent_link(uuid,boolean),public.offszn_unlink_parent(uuid),public.offszn_list_family_links() from public,anon;
grant execute on function public.offszn_create_parent_invite(),public.offszn_request_parent_link(text),public.offszn_decide_parent_link(uuid,boolean),public.offszn_unlink_parent(uuid),public.offszn_list_family_links() to authenticated;
-- IMPORTANT: linking only, no parent access to athlete workout records.
-- For public release add per-account local isolation, session persistence,
-- request rate limits, abuse controls, audit logging, and verified parental consent.
