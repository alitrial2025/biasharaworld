create table public.supplier_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 200),
  visible boolean not null default false,
  coverage text not null default '',
  terms text not null default '',
  lead_days integer not null default 0 check (lead_days between 0 and 365),
  minimum_minor bigint not null default 0 check (minimum_minor between 0 and 1000000000000),
  catalogue jsonb not null default '[]' check (jsonb_typeof(catalogue) = 'array' and jsonb_array_length(catalogue) <= 20)
);

create table public.supplier_exchanges (
  id uuid primary key,
  buyer_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid not null references public.businesses(id) on delete cascade,
  buyer_name text not null,
  supplier_name text not null,
  status text not null default 'requested' check (status in (
    'requested', 'quoted', 'ordered', 'dispatched', 'disputed', 'received', 'invoiced', 'paid', 'cancelled', 'declined'
  )),
  requested_lines jsonb not null,
  offered_lines jsonb,
  quote_minor bigint check (quote_minor between 1 and 1000000000000),
  delivery_fee_minor bigint,
  invoice_reference text,
  due_on date,
  version integer not null default 1,
  updated_at timestamptz not null default clock_timestamp(),
  check (buyer_id <> supplier_id)
);
create index supplier_exchanges_buyer on public.supplier_exchanges (buyer_id, updated_at desc, id desc);
create index supplier_exchanges_supplier on public.supplier_exchanges (supplier_id, updated_at desc, id desc);

create table public.supplier_exchange_events (
  request_id uuid primary key,
  exchange_id uuid not null references public.supplier_exchanges(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_business uuid not null,
  action text not null,
  payload jsonb not null,
  version integer not null,
  recorded_at timestamptz not null default clock_timestamp(),
  unique (exchange_id, version)
);

alter table public.supplier_profiles enable row level security;
alter table public.supplier_exchanges enable row level security;
alter table public.supplier_exchange_events enable row level security;
revoke all on public.supplier_profiles, public.supplier_exchanges, public.supplier_exchange_events
  from public, anon, authenticated, service_role;
grant select on public.supplier_profiles, public.supplier_exchanges, public.supplier_exchange_events to service_role;

create function public.list_verified_suppliers(search_text text, excluded_business uuid, after_id uuid)
returns setof public.supplier_profiles
language sql stable security definer set search_path = '' as $$
  select p.*
  from public.supplier_profiles p
  where p.visible and p.business_id <> excluded_business
    and (after_id is null or p.business_id > after_id)
    and (search_text = '' or strpos(lower(p.display_name || ' ' || p.coverage || ' ' || p.catalogue::text), lower(search_text)) > 0)
    and public.merchant_verification_status(p.business_id) = 'verified'
  order by p.business_id
  limit 31;
$$;

create function public.save_supplier_profile(target_business uuid, actor uuid, profile jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  supplier_name text;
  show_profile boolean := (profile->>'visible')::boolean;
begin
  perform 1 from public.businesses where id = target_business and owner_id = actor for update;
  if not found then
    raise exception 'Owner required' using errcode = '42501';
  end if;
  if not show_profile then
    update public.supplier_profiles set visible = false where business_id = target_business;
    return;
  end if;
  if public.merchant_verification_status(target_business) <> 'verified' then
    raise exception 'Verify this supplier first' using errcode = '42501';
  end if;
  select state #>> '{profile,business}' into supplier_name
  from public.business_records where business_id = target_business;
  insert into public.supplier_profiles (
    business_id, display_name, visible, coverage, terms, lead_days, minimum_minor, catalogue
  ) values (
    target_business, supplier_name, true, profile->>'coverage', profile->>'terms',
    (profile->>'leadDays')::integer, (profile->>'minimumMinor')::bigint, profile->'catalogue'
  )
  on conflict (business_id) do update set display_name = excluded.display_name, visible = true,
    coverage = excluded.coverage, terms = excluded.terms, lead_days = excluded.lead_days,
    minimum_minor = excluded.minimum_minor, catalogue = excluded.catalogue;
end;
$$;

create function public.advance_supplier_exchange(
  actor_business uuid, actor uuid, exchange uuid, request_key uuid,
  expected_version integer, action_name text, input jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  current_exchange public.supplier_exchanges%rowtype;
  previous public.supplier_exchange_events%rowtype;
  listed_name text;
  next_status text;
  quoted_total bigint;
  buyer_action boolean;
  next_version integer;
begin
  if not exists (
    select 1 from public.business_members
    where business_id = actor_business and user_id = actor and role in ('Owner', 'Manager')
  ) then
    raise exception 'Exchange access denied' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(exchange::text, 0));
  select * into current_exchange from public.supplier_exchanges where id = exchange;
  if found and actor_business not in (current_exchange.buyer_id, current_exchange.supplier_id) then
    raise exception 'Exchange not found' using errcode = 'P0002';
  end if;

  select * into previous from public.supplier_exchange_events where request_id = request_key;
  if found then
    if previous.exchange_id = exchange and previous.actor_id = actor and previous.actor_business = actor_business
      and previous.action = action_name and previous.payload = input then
      return current_exchange.version;
    end if;
    raise exception 'Request ID already in use' using errcode = '23505';
  end if;

  if action_name = 'request' then
    if current_exchange.id is not null then
      raise exception 'Exchange ID already in use' using errcode = '23505';
    end if;
    if public.merchant_verification_status(actor_business) <> 'verified' then
      raise exception 'Verify the buying business first' using errcode = '42501';
    end if;
    select display_name into listed_name from public.supplier_profiles p
    where p.business_id = (input->>'supplierId')::uuid and p.business_id <> actor_business and p.visible
      and public.merchant_verification_status(p.business_id) = 'verified';
    if not found then
      raise exception 'Supplier listing unavailable' using errcode = 'P0002';
    end if;
    insert into public.supplier_exchanges (id, buyer_id, supplier_id, buyer_name, supplier_name, requested_lines)
    select exchange, actor_business, (input->>'supplierId')::uuid, state #>> '{profile,business}', listed_name, input->'lines'
    from public.business_records where business_id = actor_business
    returning version into next_version;
  else
    if current_exchange.id is null then
      raise exception 'Exchange not found' using errcode = 'P0002';
    end if;
    if current_exchange.version <> expected_version then
      raise exception 'Exchange has changed' using errcode = '40001';
    end if;
    buyer_action := actor_business = current_exchange.buyer_id;
    next_status := case
      when not buyer_action and action_name = 'quote' and current_exchange.status in ('requested', 'quoted') then 'quoted'
      when not buyer_action and action_name = 'decline' and current_exchange.status in ('requested', 'quoted') then 'declined'
      when buyer_action and action_name = 'accept' and current_exchange.status = 'quoted' then 'ordered'
      when buyer_action and action_name = 'cancel' and current_exchange.status in ('requested', 'quoted') then 'cancelled'
      when not buyer_action and action_name = 'dispatch' and current_exchange.status in ('ordered', 'disputed') then 'dispatched'
      when buyer_action and action_name = 'receive' and current_exchange.status = 'dispatched' then 'received'
      when buyer_action and action_name = 'dispute' and current_exchange.status = 'dispatched' then 'disputed'
      when not buyer_action and action_name = 'invoice' and current_exchange.status = 'received' then 'invoiced'
      when buyer_action and action_name = 'record_payment' and current_exchange.status = 'invoiced' then 'paid'
    end;
    if next_status is null then
      raise exception 'Exchange transition unavailable' using errcode = '22023';
    end if;
    if action_name = 'accept' and (public.merchant_verification_status(current_exchange.buyer_id) <> 'verified'
        or public.merchant_verification_status(current_exchange.supplier_id) <> 'verified') then
      raise exception 'Both businesses must complete verification' using errcode = '42501';
    end if;
    if action_name = 'quote' then
      select sum(l.quantity::bigint * l."unitMinor") + (input->>'deliveryFeeMinor')::bigint into quoted_total
      from jsonb_to_recordset(input->'lines') as l(quantity integer, "unitMinor" bigint);
    end if;
    update public.supplier_exchanges set status = next_status, version = version + 1, updated_at = clock_timestamp(),
      quote_minor = coalesce(quoted_total, quote_minor),
      offered_lines = case when action_name = 'quote' then input->'lines' else offered_lines end,
      delivery_fee_minor = case when action_name = 'quote' then (input->>'deliveryFeeMinor')::bigint else delivery_fee_minor end,
      invoice_reference = case when action_name = 'invoice' then input->>'invoiceReference' else invoice_reference end,
      due_on = case when action_name = 'invoice' then (input->>'dueOn')::date else due_on end
    where id = exchange returning version into next_version;
  end if;

  insert into public.supplier_exchange_events (request_id, exchange_id, actor_id, actor_business, action, payload, version)
  values (request_key, exchange, actor, actor_business, action_name, input, next_version);
  return next_version;
end;
$$;

revoke all on function public.list_verified_suppliers(text, uuid, uuid),
  public.save_supplier_profile(uuid, uuid, jsonb),
  public.advance_supplier_exchange(uuid, uuid, uuid, uuid, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.list_verified_suppliers(text, uuid, uuid),
  public.save_supplier_profile(uuid, uuid, jsonb),
  public.advance_supplier_exchange(uuid, uuid, uuid, uuid, integer, text, jsonb) to service_role;
