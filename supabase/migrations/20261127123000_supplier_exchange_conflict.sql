create or replace function public.advance_supplier_exchange(
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
      -- PostgREST retries serialization failures. A stale version requires a reload.
      raise sqlstate 'PT409' using message = 'Exchange has changed';
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
