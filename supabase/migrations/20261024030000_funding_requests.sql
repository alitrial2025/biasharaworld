-- Funding preparation is owner-only. No lending provider or automatic approval is implied.
create table public.funding_applications (
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 revision bigint not null default 1 check (revision > 0),
 status text not null check (status in ('draft','submitted','withdrawn')),
 payload jsonb not null,
 readiness jsonb not null default '{}',
 history jsonb not null default '[]',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz
);
create index funding_applications_business on public.funding_applications(business_id,updated_at desc);
create table public.funding_request_log (
 business_id uuid not null references public.businesses(id) on delete cascade,
 request_id uuid not null,
 user_id uuid not null references auth.users(id),
 request_hash text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(business_id,request_id)
);
alter table public.funding_applications enable row level security;
alter table public.funding_request_log enable row level security;
create policy funding_owner_read on public.funding_applications for select to authenticated
using (exists(select 1 from public.business_members m where m.business_id=funding_applications.business_id and m.user_id=(select auth.uid()) and m.role='Owner'));
-- Requests are written through the checked API/RPC only; no client insert/update policies.
revoke all on public.funding_applications,public.funding_request_log from anon;
revoke insert,update,delete on public.funding_applications,public.funding_request_log from authenticated;
grant select on public.funding_applications to authenticated;

create or replace function public.save_funding_request(
 p_business uuid,p_user uuid,p_id uuid,p_revision bigint,p_request uuid,p_hash text,p_action text,p_payload jsonb,p_readiness jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_record public.funding_applications; previous public.funding_request_log; result jsonb; next_status text;
begin
 perform 1 from public.businesses where id=p_business for update;
 if not exists(select 1 from public.business_members where business_id=p_business and user_id=p_user and role='Owner') then raise exception 'Owner access required' using errcode='42501'; end if;
 select * into previous from public.funding_request_log where business_id=p_business and request_id=p_request;
 if found then
   if previous.user_id<>p_user or previous.request_hash<>p_hash then raise exception 'Request ID already used' using errcode='23505'; end if;
   return previous.result || jsonb_build_object('duplicate',true);
 end if;
 if p_action not in ('save','submit','withdraw') then raise exception 'Invalid funding action'; end if;
 select * into current_record from public.funding_applications where id=p_id for update;
 if found then
   if current_record.business_id<>p_business then raise exception 'Application not found' using errcode='42501'; end if;
   if current_record.revision<>p_revision then return jsonb_build_object('conflict',true); end if;
   if current_record.status='withdrawn' or (current_record.status='submitted' and p_action<>'withdraw') then return jsonb_build_object('locked',true); end if;
 else
   if p_revision<>0 or p_action='withdraw' then return jsonb_build_object('conflict',true); end if;
 end if;
 next_status=case p_action when 'submit' then 'submitted' when 'withdraw' then 'withdrawn' else 'draft' end;
 insert into public.funding_applications(id,business_id,created_by,status,payload,readiness,history,submitted_at)
 values(p_id,p_business,p_user,next_status,p_payload,p_readiness,jsonb_build_array(jsonb_build_object('action',p_action,'at',now())),case when p_action='submit' then now() else null end)
 on conflict(id) do update set revision=funding_applications.revision+1,status=next_status,
 payload=case when p_action='withdraw' then funding_applications.payload else p_payload end,
 readiness=case when p_action='withdraw' then funding_applications.readiness else p_readiness end,
 history=funding_applications.history || jsonb_build_array(jsonb_build_object('action',p_action,'at',now())),updated_at=now(),
 submitted_at=case when p_action='submit' then now() else funding_applications.submitted_at end
 returning * into current_record;
 result=jsonb_build_object('application',to_jsonb(current_record));
 insert into public.funding_request_log(business_id,request_id,user_id,request_hash,result) values(p_business,p_request,p_user,p_hash,result);
 return result;
end; $$;
revoke all on function public.save_funding_request(uuid,uuid,uuid,bigint,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_funding_request(uuid,uuid,uuid,bigint,uuid,text,text,jsonb,jsonb) to service_role;
