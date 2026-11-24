create table public.business_identity_verifications (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid not null,
  session_id uuid not null unique,
  status text not null check (status in (
    'Not Started', 'In Progress', 'Approved', 'Declined', 'In Review',
    'Resubmitted', 'Expired', 'Abandoned', 'Kyc Expired'
  )),
  checked_at timestamptz not null
);

alter table public.business_identity_verifications enable row level security;
revoke all on public.business_identity_verifications from anon, authenticated;
grant select, insert, update, delete on public.business_identity_verifications to service_role;

create function public.has_verified_business_owner(target_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_identity_verifications v
    join public.businesses b on b.id = v.business_id and b.owner_id = v.owner_id
    where v.business_id = target_business and v.status = 'Approved'
  );
$$;
revoke all on function public.has_verified_business_owner(uuid) from public, anon, authenticated;
grant execute on function public.has_verified_business_owner(uuid) to service_role;

create function public.require_verified_shop_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.business_identity_verifications v
    join public.businesses b on b.id = v.business_id and b.owner_id = v.owner_id
    where v.business_id = new.business_id and v.status = 'Approved' for share of v;
  if not found then
    raise exception 'Business owner identity verification is required.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.require_verified_shop_owner() from public, anon, authenticated;

create trigger verify_owner_before_publishing
before update of state on public.business_records
for each row when (
  new.state #> '{operations,shop,published}' = 'true'::jsonb
  and old.state #> '{operations,shop,published}' is distinct from 'true'::jsonb
) execute function public.require_verified_shop_owner();

create trigger verify_owner_before_accepting_customer_order
before insert on public.customer_order_access
for each row execute function public.require_verified_shop_owner();
