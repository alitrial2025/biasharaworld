-- Business KYC readiness only. No government IDs, bank credentials, documents or biometric data.
create table if not exists public.business_verifications (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  profile jsonb not null default '{}'::jsonb,
  consent_version text,
  consented_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.business_verifications enable row level security;
revoke all on public.business_verifications from anon;
grant select, insert, update, delete on public.business_verifications to authenticated;
create policy owner_verification_read on public.business_verifications for select to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.business_members m where m.business_id = business_verifications.business_id and m.user_id = (select auth.uid()) and m.role = 'Owner'));
create policy owner_verification_insert on public.business_verifications for insert to authenticated
with check (owner_id = (select auth.uid()) and exists (select 1 from public.business_members m where m.business_id = business_verifications.business_id and m.user_id = (select auth.uid()) and m.role = 'Owner'));
create policy owner_verification_update on public.business_verifications for update to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.business_members m where m.business_id = business_verifications.business_id and m.user_id = (select auth.uid()) and m.role = 'Owner'))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.business_members m where m.business_id = business_verifications.business_id and m.user_id = (select auth.uid()) and m.role = 'Owner'));
create policy owner_verification_delete on public.business_verifications for delete to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.business_members m where m.business_id = business_verifications.business_id and m.user_id = (select auth.uid()) and m.role = 'Owner'));
