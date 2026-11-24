create table public.merchant_payment_accounts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_last_four text not null check (account_last_four ~ '^[0-9]{4}$'),
  subaccount_code text unique,
  created_at timestamptz not null default now()
);

create table public.customer_order_payments (
  business_id uuid not null,
  order_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  amount_minor integer not null check (amount_minor > 0),
  subaccount_code text not null,
  checkout_url text,
  provider_transaction_id text unique,
  channel text check (channel in ('card','mobile_money')),
  receipt_id integer,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (business_id,order_id),
  foreign key (business_id,order_id) references public.customer_order_access(business_id,order_id) on delete cascade
);

alter table public.merchant_payment_accounts enable row level security;
alter table public.customer_order_payments enable row level security;
revoke all on public.merchant_payment_accounts,public.customer_order_payments from public,anon,authenticated;
grant select,insert,update,delete on public.merchant_payment_accounts,public.customer_order_payments to service_role;

create function public.begin_customer_order_payment(
  target_business uuid, target_order integer, customer uuid, payment_reference text, destination text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare records jsonb; found_order jsonb; payment public.customer_order_payments;
begin
  select state into records from public.business_records where business_id=target_business for update;
  if not exists(select 1 from public.customer_order_access where business_id=target_business and order_id=target_order and user_id=customer) then
    raise exception 'Order not found' using errcode='42501';
  end if;
  select * into payment from public.customer_order_payments where business_id=target_business and order_id=target_order;
  if found then return to_jsonb(payment) || jsonb_build_object('created',false); end if;
  if not public.has_verified_business_owner(target_business) or not exists (
    select 1 from public.merchant_payment_accounts a join public.businesses b on b.id=a.business_id and b.owner_id=a.owner_id
    where a.business_id=target_business and a.subaccount_code=destination
  ) then raise exception 'Online payments are unavailable for this shop' using errcode='42501'; end if;
  select item into found_order from jsonb_array_elements(records #> '{operations,deliveries}') item
    where item->>'id'=target_order::text;
  if found_order is null or found_order->>'status' is distinct from 'Delivered' or found_order->'paid' is distinct from 'false'::jsonb
      or coalesce((found_order->>'total')::bigint,0) not between 1 and 1000000000 then
    raise exception 'This order is not eligible for online payment' using errcode='22023';
  end if;
  insert into public.customer_order_payments(business_id,order_id,user_id,reference,amount_minor,subaccount_code)
    values(target_business,target_order,customer,payment_reference,(found_order->>'total')::integer,destination) returning * into payment;
  return to_jsonb(payment) || jsonb_build_object('created',true);
end;
$$;

create function public.prevent_duplicate_order_payment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists (
    select 1 from public.customer_order_payments p
    join lateral jsonb_array_elements(new.state #> '{operations,deliveries}') n on n->>'id'=p.order_id::text
    join lateral jsonb_array_elements(old.state #> '{operations,deliveries}') o on o->>'id'=p.order_id::text
    where p.business_id=new.business_id and p.paid_at is null and n->'paid'='true'::jsonb and o->'paid'='false'::jsonb
  ) then raise exception 'An online payment is pending for this order' using errcode='42501'; end if;
  return new;
end;
$$;
create trigger prevent_duplicate_order_payment before update of state on public.business_records
for each row execute function public.prevent_duplicate_order_payment();

create function public.confirm_customer_order_payment(
  payment_reference text, current_revision bigint, transaction_id text, payment_channel text,
  payment_time timestamptz, target_receipt integer, next_state jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare payment public.customer_order_payments; revision_now bigint;
begin
  select * into payment from public.customer_order_payments where reference=payment_reference;
  if not found then return false; end if;
  select revision into revision_now from public.business_records where business_id=payment.business_id for update;
  select * into payment from public.customer_order_payments where reference=payment_reference for update;
  if not found then return false; end if;
  if payment.paid_at is not null then return payment.provider_transaction_id=transaction_id; end if;
  if revision_now is distinct from current_revision then return false; end if;
  update public.customer_order_payments set provider_transaction_id=transaction_id, channel=payment_channel,
    paid_at=payment_time,receipt_id=target_receipt,checkout_url=null where reference=payment_reference;
  update public.business_records set state=next_state,revision=revision+1,updated_at=now() where business_id=payment.business_id;
  return true;
end;
$$;

revoke all on function public.begin_customer_order_payment(uuid,integer,uuid,text,text),
  public.confirm_customer_order_payment(text,bigint,text,text,timestamptz,integer,jsonb),
  public.prevent_duplicate_order_payment() from public,anon,authenticated;
grant execute on function public.begin_customer_order_payment(uuid,integer,uuid,text,text),
  public.confirm_customer_order_payment(text,bigint,text,text,timestamptz,integer,jsonb) to service_role;
