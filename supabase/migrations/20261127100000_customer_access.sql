create table public.customer_service_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id integer not null,
  member_id integer not null,
  starts_at timestamptz not null,
  enabled boolean not null default true,
  booked_by uuid references auth.users(id) on delete set null,
  booking_id integer,
  created_at timestamptz not null default now()
);
create unique index customer_service_open_slot on public.customer_service_slots(business_id, member_id, starts_at)
  where enabled and booking_id is null;
create index customer_service_calendar on public.customer_service_slots(business_id, starts_at);
create index customer_service_customer on public.customer_service_slots(business_id, booked_by);

create table public.customer_event_offers (
  business_id uuid not null references public.businesses(id) on delete cascade,
  show_id uuid not null,
  price_minor bigint not null check (price_minor between 0 and 1000000000000),
  enabled boolean not null default true,
  primary key(business_id, show_id)
);

create table public.customer_rent_links (
  business_id uuid not null references public.businesses(id) on delete cascade,
  rent_id uuid not null,
  token_hash text not null unique,
  recipient_email text not null,
  expires_at timestamptz not null,
  primary key(business_id, rent_id)
);

alter table public.customer_service_slots enable row level security;
alter table public.customer_event_offers enable row level security;
alter table public.customer_rent_links enable row level security;
revoke all on public.customer_service_slots, public.customer_event_offers, public.customer_rent_links from public, anon, authenticated;
grant select, insert, update, delete on public.customer_service_slots, public.customer_event_offers, public.customer_rent_links to service_role;

create function public.claim_public_service_slot(
  target_business uuid, expected_type text, expected_revision bigint, target_slot uuid,
  customer_user uuid, next_state jsonb, new_booking integer
) returns integer language plpgsql security definer set search_path = '' as $$
declare current_state text; current_revision bigint; slot public.customer_service_slots;
begin
  select state #>> '{profile,type}', revision into current_state, current_revision from public.business_records
    where business_id = target_business for update;
  select * into slot from public.customer_service_slots where business_id = target_business and id = target_slot for update;
  if slot.id is null then return null; end if;
  if slot.booking_id is not null and slot.booked_by = customer_user then return slot.booking_id; end if;
  if slot.booking_id is not null or not slot.enabled or slot.starts_at <= now()
    or current_state is distinct from expected_type or current_revision is distinct from expected_revision
    or public.merchant_verification_status(target_business) is distinct from 'verified' then
    return null;
  end if;
  update public.business_records set state = next_state, revision = revision + 1, updated_at = now()
    where business_id = target_business;
  update public.customer_service_slots set booked_by = customer_user, booking_id = new_booking where id = slot.id;
  return new_booking;
end;
$$;

create function public.commit_public_ticket(
  target_business uuid, expected_type text, expected_revision integer, customer_user uuid,
  target_show uuid, price bigint, request_id uuid, request_hash text, target_ticket uuid, next_records jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_type text; current_revision integer; previous public.industry_workspace_actions; offer public.customer_event_offers;
begin
  select state #>> '{profile,type}' into current_type from public.business_records
    where business_id = target_business for update;
  select a.* into previous from public.industry_workspace_actions a
    where a.business_id = target_business and a.request_id = commit_public_ticket.request_id;
  if previous.request_id is not null then
    if previous.actor is distinct from customer_user or previous.command_hash <> request_hash then
      return null;
    end if;
    return previous.record_id;
  end if;
  select * into offer from public.customer_event_offers where business_id = target_business and show_id = target_show for update;
  select revision into current_revision from public.industry_workspaces
    where business_id = target_business and sector = 'entertainment';
  if offer.show_id is null or not offer.enabled or offer.price_minor <> price
    or current_type is distinct from expected_type or current_revision is distinct from expected_revision
    or public.merchant_verification_status(target_business) is distinct from 'verified' then
    return null;
  end if;
  update public.industry_workspaces set revision = revision + 1, records = next_records
    where business_id = target_business and sector = 'entertainment';
  insert into public.industry_workspace_actions(business_id, request_id, actor, command_hash, record_id, action)
    values (target_business, request_id, customer_user, request_hash, target_ticket, 'create');
  return target_ticket;
end;
$$;

revoke all on function public.claim_public_service_slot(uuid,text,bigint,uuid,uuid,jsonb,integer) from public, anon, authenticated;
revoke all on function public.commit_public_ticket(uuid,text,integer,uuid,uuid,bigint,uuid,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.claim_public_service_slot(uuid,text,bigint,uuid,uuid,jsonb,integer) to service_role;
grant execute on function public.commit_public_ticket(uuid,text,integer,uuid,uuid,bigint,uuid,text,uuid,jsonb) to service_role;
