-- Readiness submission is server-authoritative: direct table writes must not bypass validation.
revoke insert, update, delete on public.business_verifications from authenticated;
grant all on public.business_verifications to service_role;
drop policy if exists owner_verification_insert on public.business_verifications;
drop policy if exists owner_verification_update on public.business_verifications;
drop policy if exists owner_verification_delete on public.business_verifications;
