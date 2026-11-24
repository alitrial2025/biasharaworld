create table public.business_registry_verifications (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid not null,
  attempt_id uuid not null unique,
  session_id uuid unique,
  status text check (status in (
    'Not Started', 'In Progress', 'Approved', 'Declined', 'In Review',
    'Resubmitted', 'Awaiting User', 'Expired', 'Abandoned', 'Kyc Expired'
  )),
  kenya_registry_passed boolean not null default false,
  checked_at timestamptz not null,
  check ((session_id is null) = (status is null)),
  check (not kenya_registry_passed or (status is not null and status = 'Approved'))
);

create table public.company_representative_reviews (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  company_session_id uuid not null,
  identity_session_id uuid not null,
  verdict text not null check (verdict in ('Approved', 'Declined')),
  case_reference text not null unique check (case_reference ~ '^[A-Za-z0-9_-]{1,64}$'),
  reviewer text not null check (reviewer ~ '^[A-Za-z0-9_-]{1,64}$'),
  reviewed_at timestamptz not null default clock_timestamp()
);
create index company_representative_reviews_session_idx
  on public.company_representative_reviews (business_id, owner_id, company_session_id, identity_session_id, id desc);

alter table public.business_registry_verifications enable row level security;
alter table public.company_representative_reviews enable row level security;
revoke all on public.business_registry_verifications from public, anon, authenticated, service_role;
revoke all on public.company_representative_reviews from public, anon, authenticated, service_role;
grant select, insert, update on public.business_registry_verifications to service_role;
grant select on public.company_representative_reviews to service_role;

-- The operator supplies both references to bind the decision to the evidence they reviewed.
create function public.review_company_representative(
  target_business uuid, company_session uuid, identity_session uuid,
  decision text, ops_case_reference text, operator_reference text
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  representative_id uuid;
begin
  select b.owner_id into representative_id
    from public.businesses b
    join public.business_identity_verifications i
      on i.business_id = b.id and i.owner_id = b.owner_id
    join public.business_registry_verifications r
      on r.business_id = b.id and r.owner_id = b.owner_id
    where b.id = target_business
      and i.session_id = identity_session and i.status = 'Approved'
      and r.session_id = company_session and r.status = 'Approved' and r.kenya_registry_passed
    for share of b, i, r;
  if not found then
    raise exception 'The reviewed company and owner approvals must match the current sessions.' using errcode = '23514';
  end if;

  insert into public.company_representative_reviews (
    business_id, owner_id, company_session_id, identity_session_id, verdict, case_reference, reviewer
  ) values (
    target_business, representative_id, company_session, identity_session, decision, ops_case_reference, operator_reference
  );
end;
$$;
revoke all on function public.review_company_representative(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
