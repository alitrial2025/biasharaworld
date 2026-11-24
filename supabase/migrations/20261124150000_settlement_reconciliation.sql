create table public.settlement_statement_lines (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null check (source in ('provider', 'bank', 'mobile_money')),
  reference text not null check (reference ~ '^[A-Za-z0-9][A-Za-z0-9_.:/ -]{0,119}$'),
  posted_on date not null,
  amount_minor bigint not null check (amount_minor between 1 and 1000000000000),
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default clock_timestamp(),
  discarded_by uuid references auth.users(id) on delete set null,
  discarded_at timestamptz,
  discard_reason text check (char_length(discard_reason) between 1 and 200),
  check ((discarded_at is null) = (discard_reason is null))
);
create unique index settlement_statement_active_ref
  on public.settlement_statement_lines (business_id, reference, source)
  where discarded_at is null;

alter table public.settlement_statement_lines enable row level security;
revoke all on public.settlement_statement_lines from public, anon, authenticated, service_role;

create function public.import_settlement_statement(target_business uuid, actor uuid, statement_source text, lines jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  added integer;
begin
  perform 1 from public.businesses where id = target_business for update;
  if not exists (
    select 1 from public.business_members
    where business_id = target_business and user_id = actor and role in ('Owner', 'Manager')
  ) then
    raise exception 'Settlement access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 500 then
    raise exception 'Invalid statement lines' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(lines) as incoming(reference text, posted_on date, amount_minor bigint)
    join public.settlement_statement_lines existing on
      existing.business_id = target_business and existing.source = statement_source
      and existing.reference = incoming.reference and existing.discarded_at is null
    where (existing.posted_on, existing.amount_minor) is distinct from (incoming.posted_on, incoming.amount_minor)
  ) then
    raise exception 'A reference has conflicting statement details' using errcode = '23505';
  end if;

  insert into public.settlement_statement_lines (business_id, source, reference, posted_on, amount_minor, imported_by)
  select target_business, statement_source, incoming.reference, incoming.posted_on, incoming.amount_minor, actor
  from jsonb_to_recordset(lines) as incoming(reference text, posted_on date, amount_minor bigint)
  on conflict (business_id, reference, source) where discarded_at is null do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;

create function public.discard_settlement_line(target_business uuid, actor uuid, statement_line bigint, reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.businesses where id = target_business for update;
  if not exists (
    select 1 from public.businesses where id = target_business and owner_id = actor
  ) then
    raise exception 'Only the owner can correct a statement' using errcode = '42501';
  end if;
  update public.settlement_statement_lines
  set discarded_at = clock_timestamp(), discarded_by = actor, discard_reason = reason
  where id = statement_line and business_id = target_business and discarded_at is null;
  return found;
end;
$$;

create function public.match_settlement_statements(target_business uuid, actor uuid, after_reference text, exceptions_only boolean)
returns table (reference text, lines jsonb, status text)
language sql stable security definer set search_path = '' as $$
  with grouped as (
    select s.reference,
      jsonb_agg(jsonb_build_object('id', s.id, 'source', s.source, 'date', s.posted_on, 'amountMinor', s.amount_minor)
        order by s.source) as lines,
      case
        when count(*) filter (where s.source <> 'provider') > 1 then 'multiple_deposits'
        when count(*) filter (where s.source = 'provider') = 0 then 'missing_provider'
        when count(*) filter (where s.source <> 'provider') = 0 then 'missing_deposit'
        when min(s.amount_minor) <> max(s.amount_minor) then 'amount_mismatch'
        else 'matched'
      end as status
    from public.settlement_statement_lines s
    where s.business_id = target_business and s.discarded_at is null
      and (after_reference is null or s.reference > after_reference)
      and exists (
        select 1 from public.business_members
        where business_id = target_business and user_id = actor and role in ('Owner', 'Manager')
      )
    group by s.reference
  )
  select g.reference, g.lines, g.status
  from grouped g where not exceptions_only or g.status <> 'matched'
  order by g.reference
  limit 51;
$$;

revoke all on function public.import_settlement_statement(uuid, uuid, text, jsonb),
  public.discard_settlement_line(uuid, uuid, bigint, text),
  public.match_settlement_statements(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.import_settlement_statement(uuid, uuid, text, jsonb),
  public.discard_settlement_line(uuid, uuid, bigint, text),
  public.match_settlement_statements(uuid, uuid, text, boolean) to service_role;
