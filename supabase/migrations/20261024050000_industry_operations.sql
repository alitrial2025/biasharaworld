-- Administrative sector workflows. Payments are manual ledger entries, never money movement.
create table public.industry_records (
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 industry_id text not null,
 workflow_id text not null,
 revision bigint not null default 1 check(revision>0),
 title text not null,
 customer text not null default '',
 status text not null,
 fields jsonb not null default '{}',
 amount_minor bigint not null check(amount_minor between 0 and 1000000000000),
 paid_minor bigint not null default 0 check(paid_minor>=0 and paid_minor<=amount_minor),
 payments jsonb not null default '[]',
 history jsonb not null default '[]',
 archived boolean not null default false,
 reservation_pool text,
 reservation_resource text,
 reservation_start timestamptz,
 reservation_end timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(reservation_start is null or reservation_end>reservation_start)
);
create index industry_records_business on public.industry_records(business_id,updated_at desc);
create table public.industry_request_log (
 business_id uuid not null references public.businesses(id) on delete cascade,
 request_id uuid not null,
 user_id uuid not null references auth.users(id),
 request_hash text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(business_id,request_id)
);
alter table public.industry_records enable row level security;
alter table public.industry_request_log enable row level security;
-- APIs check readiness and membership; direct client reads cannot bypass redaction or gating.
revoke all on public.industry_records,public.industry_request_log from public,anon,authenticated;
grant all on public.industry_records,public.industry_request_log to service_role;
create or replace function public.save_industry_record(
 p_business uuid,p_user uuid,p_id uuid,p_revision bigint,p_request uuid,p_hash text,p_action text,p_record jsonb,p_payment jsonb,p_reservation jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_record public.industry_records; previous public.industry_request_log; result jsonb; member_role text; event jsonb; delta bigint; next_paid bigint;
begin
 -- Serializes all reservations and payment changes within a business, including empty calendars.
 perform 1 from public.businesses where id=p_business for update;
 select role into member_role from public.business_members where business_id=p_business and user_id=p_user;
 if member_role is null then raise exception 'Business access required' using errcode='42501'; end if;
 select * into previous from public.industry_request_log where business_id=p_business and request_id=p_request;
 if found then
  if previous.user_id<>p_user or previous.request_hash<>p_hash then raise exception 'Request ID used' using errcode='23505'; end if;
  return previous.result || jsonb_build_object('duplicate',true);
 end if;
 if not public.business_features_unlocked(p_business) then raise exception 'Business details required' using errcode='42501'; end if;
 if member_role not in ('Owner','Manager','Cashier') or (p_action='archive' and member_role not in ('Owner','Manager')) then raise exception 'Role cannot make this change' using errcode='42501'; end if;
 if p_action not in ('create','update','status','payment','refund','archive') then raise exception 'Invalid action'; end if;
 select * into current_record from public.industry_records where id=p_id for update;
 if found then
  if current_record.business_id<>p_business then raise exception 'Record not found' using errcode='42501'; end if;
  if p_action='create' or current_record.revision<>p_revision then return jsonb_build_object('conflict',true); end if;
  if current_record.archived then return jsonb_build_object('locked',true); end if;
  if current_record.industry_id<>p_record->>'industry_id' or current_record.workflow_id<>p_record->>'workflow_id' then raise exception 'Workflow cannot change'; end if;
 else
  if p_action<>'create' or p_revision<>0 then return jsonb_build_object('conflict',true); end if;
 end if;
 next_paid=coalesce(current_record.paid_minor,0);
 if p_action in ('payment','refund') then
  delta=(p_payment->>'amountMinor')::bigint;
  if delta<=0 then raise exception 'Invalid payment amount'; end if;
  next_paid=next_paid+case when p_action='refund' then -delta else delta end;
 end if;
 if next_paid<0 or next_paid>(p_record->>'amount_minor')::bigint then return jsonb_build_object('balanceConflict',true); end if;
 if p_reservation is not null and exists (
  select 1 from public.industry_records r where r.business_id=p_business and r.id<>p_id and not r.archived
  and r.reservation_pool=p_reservation->>'pool' and r.reservation_resource=p_reservation->>'resource'
  and r.reservation_start<(p_reservation->>'end')::timestamptz and r.reservation_end>(p_reservation->>'start')::timestamptz
 ) then return jsonb_build_object('bookingConflict',true); end if;
 event=jsonb_build_object('action',p_action,'at',now(),'userId',p_user,'status',p_record->>'status');
 insert into public.industry_records(id,business_id,industry_id,workflow_id,title,customer,status,fields,amount_minor,paid_minor,payments,history,archived,reservation_pool,reservation_resource,reservation_start,reservation_end)
 values(p_id,p_business,p_record->>'industry_id',p_record->>'workflow_id',p_record->>'title',p_record->>'customer',p_record->>'status',p_record->'fields',(p_record->>'amount_minor')::bigint,next_paid,
 case when p_action in ('payment','refund') then jsonb_build_array(p_payment || event || jsonb_build_object('id',p_request)) else '[]'::jsonb end,jsonb_build_array(event),p_action='archive',p_reservation->>'pool',p_reservation->>'resource',(p_reservation->>'start')::timestamptz,(p_reservation->>'end')::timestamptz)
 on conflict(id) do update set revision=industry_records.revision+1,title=excluded.title,customer=excluded.customer,status=excluded.status,fields=excluded.fields,amount_minor=excluded.amount_minor,paid_minor=next_paid,
 payments=industry_records.payments || excluded.payments,history=industry_records.history || excluded.history,archived=excluded.archived,reservation_pool=excluded.reservation_pool,reservation_resource=excluded.reservation_resource,reservation_start=excluded.reservation_start,reservation_end=excluded.reservation_end,updated_at=now()
 returning * into current_record;
 result=jsonb_build_object('record',to_jsonb(current_record)-array['reservation_pool','reservation_resource','reservation_start','reservation_end']);
 insert into public.industry_request_log(business_id,request_id,user_id,request_hash,result) values(p_business,p_request,p_user,p_hash,result);
 return result;
end; $$;
revoke all on function public.save_industry_record(uuid,uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_industry_record(uuid,uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb) to service_role;
