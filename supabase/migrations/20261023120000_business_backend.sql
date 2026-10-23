-- All writes go through the authenticated application server. No client-supplied snapshots.
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete restrict,
 slug text not null unique default encode(gen_random_bytes(12),'hex'),
 created_at timestamptz not null default now()
);
create table public.business_members (
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('Owner','Manager','Cashier','Viewer')),
 primary key (business_id,user_id)
);
create index business_members_user on public.business_members(user_id);
create table public.business_records (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 revision bigint not null default 0,
 state jsonb not null check (jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
create table public.user_workspaces (
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 state jsonb not null default '{}',
 primary key(business_id,user_id)
);
create table public.business_commands (
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 command_hash text not null,
 command_type text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key (business_id,request_id)
);
create table public.business_invites (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 email text not null,
 role text not null check(role in ('Manager','Cashier','Viewer')),
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(business_id,email)
);
create or replace function public.is_business_member(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.business_members where business_id=b and user_id=(select auth.uid()));
$$;
revoke all on function public.is_business_member(uuid) from public,anon;
grant execute on function public.is_business_member(uuid) to authenticated;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_records enable row level security;
alter table public.user_workspaces enable row level security;
alter table public.business_commands enable row level security;
alter table public.business_invites enable row level security;
create policy member_business_read on public.businesses for select to authenticated using(public.is_business_member(id));
create policy member_read on public.business_members for select to authenticated using(public.is_business_member(business_id));
create policy records_read on public.business_records for select to authenticated using(public.is_business_member(business_id));
create policy own_workspace on public.user_workspaces for select to authenticated using(user_id=(select auth.uid()) and public.is_business_member(business_id));
create policy audit_read on public.business_commands for select to authenticated using(public.is_business_member(business_id));
-- Invitations are only read by the server after verifying owner access.
revoke all on public.businesses,public.business_members,public.business_records,public.user_workspaces,public.business_commands,public.business_invites from anon,authenticated;
grant select on public.businesses,public.business_members,public.business_records,public.user_workspaces,public.business_commands to authenticated;
grant all on public.businesses,public.business_members,public.business_records,public.user_workspaces,public.business_commands,public.business_invites to service_role;

create or replace function public.create_business(p_user uuid,p_state jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select business_id into b from public.business_members where user_id=p_user order by business_id limit 1;
 if b is not null then return b; end if;
 insert into public.businesses(owner_id) values(p_user) returning id into b;
 insert into public.business_members values(b,p_user,'Owner');
 insert into public.business_records(business_id,state) values(b,p_state);
 return b;
end; $$;

create or replace function public.commit_business_command(
 p_business uuid,p_user uuid,p_revision bigint,p_request uuid,p_hash text,p_type text,
 p_state jsonb,p_workspace jsonb,p_result jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint; previous public.business_commands; membership text;
begin
 select revision into current_revision from public.business_records where business_id=p_business for update;
 select role into membership from public.business_members where business_id=p_business and user_id=p_user;
 if membership is null then raise exception 'Access denied' using errcode='42501'; end if;
 select * into previous from public.business_commands where business_id=p_business and request_id=p_request;
 if found then
  if previous.user_id<>p_user or previous.command_hash<>p_hash then
   raise exception 'Request ID was already used for a different command' using errcode='23505';
  end if;
  return previous.result || jsonb_build_object('duplicate',true);
 end if;
 if current_revision<>p_revision then raise exception 'Records changed. Refresh and review before trying again.' using errcode='40001'; end if;
 update public.business_records set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business;
 insert into public.user_workspaces(business_id,user_id,state) values(p_business,p_user,p_workspace)
 on conflict(business_id,user_id) do update set state=excluded.state;
 insert into public.business_commands(business_id,user_id,request_id,command_hash,command_type,result)
 values(p_business,p_user,p_request,p_hash,p_type,p_result || jsonb_build_object('revision',current_revision+1));
 return p_result || jsonb_build_object('revision',current_revision+1);
end; $$;
revoke all on function public.create_business(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.commit_business_command(uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_business(uuid,jsonb) to service_role;
grant execute on function public.commit_business_command(uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb) to service_role;
