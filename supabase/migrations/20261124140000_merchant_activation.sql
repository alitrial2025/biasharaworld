alter table public.businesses add column legal_structure text
  check (legal_structure in ('individual', 'registered_entity'));

create function public.merchant_verification_status(target_business uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when b.legal_structure is null then 'business_type_required'
      when i.status is distinct from 'Approved' then 'owner_identity_required'
      when b.legal_structure = 'registered_entity' and (
        r.kenya_registry_passed is distinct from true or (
          select v.verdict
          from public.company_representative_reviews v
          where v.business_id = b.id and v.owner_id = b.owner_id
            and v.company_session_id = r.session_id and v.identity_session_id = i.session_id
          order by v.id desc limit 1
        ) is distinct from 'Approved'
      ) then 'company_verification_required'
      else 'verified'
    end
    from public.businesses b
    left join public.business_identity_verifications i on i.business_id = b.id and i.owner_id = b.owner_id
    left join public.business_registry_verifications r on r.business_id = b.id and r.owner_id = b.owner_id
    where b.id = target_business
  ), 'business_type_required');
$$;
revoke all on function public.merchant_verification_status(uuid) from public, anon, authenticated;
grant execute on function public.merchant_verification_status(uuid) to service_role;

create or replace function public.require_verified_shop_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := new.business_id;
begin
  perform 1 from public.businesses where id = target for share;
  perform 1 from public.business_identity_verifications where business_id = target for share;
  perform 1 from public.business_registry_verifications where business_id = target for share;
  if public.merchant_verification_status(target) <> 'verified' then
    raise exception 'Merchant verification is required.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger verify_merchant_before_connecting_settlement
before insert on public.merchant_payment_accounts
for each row execute function public.require_verified_shop_owner();

create trigger verify_merchant_before_reserving_payment
before insert on public.customer_order_payments
for each row execute function public.require_verified_shop_owner();
