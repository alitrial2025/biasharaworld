create table public.industry_workspaces (
  business_id uuid references public.businesses(id) on delete cascade,
  sector text not null,
  revision integer not null default 0,
  records jsonb not null default '[]' check (jsonb_typeof(records) = 'array'),
  primary key (business_id, sector)
);

create table public.industry_workspace_actions (
  business_id uuid references public.businesses(id) on delete cascade,
  request_id uuid not null,
  actor uuid references auth.users(id) on delete set null,
  command_hash text not null,
  record_id uuid not null,
  action text not null check (action in ('create', 'transition', 'admit')),
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (business_id, request_id)
);

alter table public.industry_workspaces enable row level security;
alter table public.industry_workspace_actions enable row level security;
revoke all on public.industry_workspaces, public.industry_workspace_actions from public, anon, authenticated, service_role;
grant select on public.industry_workspaces, public.industry_workspace_actions to service_role;

create function public.save_industry_workspace(
  target_business uuid, acting_user uuid, expected_type text, target_sector text,
  expected_revision integer, command_id uuid, payload_hash text, target_record uuid,
  command_action text, next_records jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  member_role text;
  current_type text;
  previous public.industry_workspace_actions%rowtype;
  current_revision integer;
begin
  select state #>> '{profile,type}' into current_type from public.business_records
  where business_id = target_business for update;
  select role into member_role from public.business_members
  where business_id = target_business and user_id = acting_user;
  if member_role is null or not (
    member_role in ('Owner','Manager') or
    (member_role = 'Cashier' and target_sector = 'entertainment' and command_action = 'admit')
  ) then
    raise exception 'Industry workspace access denied' using errcode = '42501';
  end if;
  select * into previous from public.industry_workspace_actions
    where business_id = target_business and request_id = command_id;
  if found then
    if previous.actor is distinct from acting_user or previous.command_hash <> payload_hash then
      raise exception 'Request ID in use' using errcode = '23505';
    end if;
    return true;
  end if;
  if current_type is distinct from expected_type then return false; end if;

  insert into public.industry_workspaces (business_id, sector)
  values (target_business, target_sector) on conflict do nothing;
  select revision into current_revision from public.industry_workspaces
    where business_id = target_business and sector = target_sector;
  if current_revision <> expected_revision then return false; end if;

  update public.industry_workspaces set revision = revision + 1, records = next_records
    where business_id = target_business and sector = target_sector;
  insert into public.industry_workspace_actions(business_id, request_id, actor, command_hash, record_id, action)
    values (target_business, command_id, acting_user, payload_hash, target_record, command_action);
  return true;
end;
$$;
revoke all on function public.save_industry_workspace(uuid, uuid, text, text, integer, uuid, text, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_industry_workspace(uuid, uuid, text, text, integer, uuid, text, uuid, text, jsonb)
  to service_role;
