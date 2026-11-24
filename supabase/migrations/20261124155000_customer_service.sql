create table public.customer_service_notes (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id integer not null,
  author_id uuid references auth.users(id) on delete set null,
  body text check (char_length(body) between 1 and 2000),
  recorded_at timestamptz not null default clock_timestamp(),
  redacted_by uuid references auth.users(id) on delete set null,
  redacted_at timestamptz,
  redact_reason text check (char_length(redact_reason) between 1 and 200),
  check ((redacted_at is null) = (body is not null))
);
create index customer_service_notes_lookup on public.customer_service_notes (business_id, customer_id, recorded_at desc, id desc);

create table public.customer_marketing_events (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_user uuid not null references auth.users(id) on delete cascade,
  email_opt_in boolean not null,
  recorded_at timestamptz not null default clock_timestamp()
);
create index customer_marketing_latest on public.customer_marketing_events (business_id, customer_user, recorded_at desc, id desc);

alter table public.customer_service_notes enable row level security;
alter table public.customer_marketing_events enable row level security;
revoke all on public.customer_service_notes, public.customer_marketing_events from public, anon, authenticated, service_role;
grant select on public.customer_service_notes, public.customer_marketing_events to service_role;

create function public.record_customer_note(
  target_business uuid, actor uuid, target_customer integer, request_id uuid, content text
) returns void language plpgsql security definer set search_path = '' as $$
declare previous public.customer_service_notes%rowtype;
begin
  if not exists (
    select 1 from public.business_members
    where business_id = target_business and user_id = actor and role in ('Owner', 'Manager')
  ) or not exists (
    select 1 from public.business_records r cross join lateral jsonb_array_elements(r.state->'customers') c
    where r.business_id = target_business and c->>'id' = target_customer::text
  ) then
    raise exception 'Customer not available' using errcode = '42501';
  end if;
  insert into public.customer_service_notes (id, business_id, customer_id, author_id, body)
  values (request_id, target_business, target_customer, actor, content) on conflict do nothing;
  if not found then
    select * into previous from public.customer_service_notes where id = request_id;
    if previous.business_id is distinct from target_business or previous.customer_id is distinct from target_customer
      or previous.author_id is distinct from actor or previous.body is distinct from content then
      raise exception 'Note request ID already in use' using errcode = '23505';
    end if;
  end if;
end;
$$;

create function public.redact_customer_note(target_business uuid, actor uuid, note_id uuid, reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.businesses where id = target_business and owner_id = actor) then
    raise exception 'Only the owner can redact a note' using errcode = '42501';
  end if;
  update public.customer_service_notes set body = null, redacted_at = clock_timestamp(), redacted_by = actor, redact_reason = reason
  where id = note_id and business_id = target_business and body is not null;
  return found;
end;
$$;

create function public.record_customer_marketing_preference(target_business uuid, actor uuid, request_id uuid, opted_in boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare verified_email text; previous public.customer_marketing_events%rowtype;
begin
  select lower(email) into verified_email from auth.users where id = actor and email_confirmed_at is not null;
  if verified_email is null or not (
    exists (select 1 from public.customer_order_access where business_id = target_business and user_id = actor)
    or exists (
      select 1 from public.business_records r cross join lateral jsonb_array_elements(r.state->'customers') c
      where r.business_id = target_business and lower(c->>'email') = verified_email
    )
  ) then
    raise exception 'Confirm a customer relationship with this business' using errcode = '42501';
  end if;
  insert into public.customer_marketing_events (id, business_id, customer_user, email_opt_in)
  values (request_id, target_business, actor, opted_in) on conflict do nothing;
  if not found then
    select * into previous from public.customer_marketing_events where id = request_id;
    if not (previous.business_id = target_business and previous.customer_user = actor and previous.email_opt_in = opted_in) then
      raise exception 'Preference request ID already in use' using errcode = '23505';
    end if;
  end if;
end;
$$;

revoke all on function public.record_customer_note(uuid, uuid, integer, uuid, text),
  public.redact_customer_note(uuid, uuid, uuid, text), public.record_customer_marketing_preference(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.record_customer_note(uuid, uuid, integer, uuid, text),
  public.redact_customer_note(uuid, uuid, uuid, text), public.record_customer_marketing_preference(uuid, uuid, uuid, boolean)
  to service_role;
