-- Completing business details unlocks working features; this is NOT provider identity verification.
-- API-only readiness writes were established by 20261024021000.
create or replace function public.business_readiness_valid(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare k text; n numeric;
begin
 if p is null or jsonb_typeof(p)<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(p))<>15 or exists(select 1 from jsonb_object_keys(p) as keys(key) where keys.key not in ('legalName','tradingName','contactName','phone','email','country','businessType','businessAddress','registrationStatus','registrationNumber','yearsTrading','employees','revenueBand','tools','declaration')) then return false; end if;
 foreach k in array array['legalName','tradingName','contactName','phone','email','businessType','businessAddress','country','registrationStatus','registrationNumber','revenueBand'] loop
  if jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
 end loop;
 foreach k in array array['legalName','tradingName','contactName','phone','email','businessType','businessAddress'] loop
  if length(btrim(p->>k))=0 then return false; end if;
 end loop;
 if length(p->>'legalName')>200 or length(p->>'tradingName')>200 or length(p->>'contactName')>200 or length(p->>'email')>200 or length(p->>'businessType')>100 or length(p->>'businessAddress')>400 or length(p->>'registrationNumber')>100 then return false; end if;
 if p->>'country'<>'KE' or p->>'registrationStatus' not in ('registered','unregistered','in_progress') or p->>'revenueBand' not in ('prefer_not_to_say','under_50000','50000_250000','250000_1000000','over_1000000') then return false; end if;
 if p->>'registrationStatus'='registered' and length(btrim(p->>'registrationNumber'))=0 then return false; end if;
 if p->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p->>'phone' !~ '^\+?[0-9[:space:]().-]{7,30}$' or length(regexp_replace(p->>'phone','[^0-9]','','g')) not between 7 and 15 then return false; end if;
 if p->'declaration'<>'true'::jsonb or jsonb_typeof(p->'tools') is distinct from 'array' then return false; end if;
 if jsonb_array_length(p->'tools')>6 or exists(select 1 from jsonb_array_elements(p->'tools') t where jsonb_typeof(t)<>'string' or (t #>> '{}') not in ('Sales','Stock','Customers','Suppliers','Reports','Funding')) then return false; end if;
 foreach k in array array['yearsTrading','employees'] loop
  if jsonb_typeof(p->k) is distinct from 'number' then return false; end if;
  n=(p->>k)::numeric;
  if n<>trunc(n) or (k='yearsTrading' and n not between 0 and 100) or (k='employees' and n not between 1 and 100000) then return false; end if;
 end loop;
 return true;
end; $$;
revoke all on function public.business_readiness_valid(jsonb) from public,anon,authenticated;
grant execute on function public.business_readiness_valid(jsonb) to service_role;
create or replace function public.business_features_unlocked(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_verifications v where v.business_id=p_business and v.status='submitted'
 and v.consent_version='2026-10-24' and v.consented_at is not null and public.business_readiness_valid(v.profile));
$$;
revoke all on function public.business_features_unlocked(uuid) from public,anon;
grant execute on function public.business_features_unlocked(uuid) to authenticated,service_role;

-- Membership still applies through the existing permissive policies. These policies narrow it.
create policy records_require_business_details on public.business_records as restrictive for select to authenticated
using(public.business_features_unlocked(business_id));
create policy workspace_require_business_details on public.user_workspaces as restrictive for select to authenticated
using(public.business_features_unlocked(business_id));
create policy audit_require_business_details on public.business_commands as restrictive for select to authenticated
using(public.business_features_unlocked(business_id));

create or replace function public.product_photo_features_unlocked(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select case when split_part(p_name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then public.business_features_unlocked(split_part(p_name,'/',1)::uuid) else false end;
$$;
revoke all on function public.product_photo_features_unlocked(text) from public,anon;
grant execute on function public.product_photo_features_unlocked(text) to authenticated,service_role;
create policy product_photos_require_business_details on storage.objects as restrictive for all to authenticated
using(bucket_id <> 'product-images' or public.product_photo_features_unlocked(name))
with check(bucket_id <> 'product-images' or public.product_photo_features_unlocked(name));

create policy funding_require_business_details on public.funding_applications as restrictive for select to authenticated
using(public.business_features_unlocked(business_id));

-- Recheck readiness inside authoritative transactions, after confirmed replay.
create or replace function public.commit_business_command(
 p_business uuid,p_user uuid,p_revision bigint,p_request uuid,p_hash text,p_type text,
 p_state jsonb,p_workspace jsonb,p_result jsonb,p_input jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint; previous public.business_commands; membership text;
begin
 select revision into current_revision from public.business_records where business_id=p_business for update;
 select role into membership from public.business_members where business_id=p_business and user_id=p_user;
 if membership is null then raise exception 'Access denied' using errcode='42501'; end if;
 if p_type in ('inviteMember','updateMember','removeMember') and membership<>'Owner' then raise exception 'Owner access required' using errcode='42501'; end if;
 if membership='Viewer' and p_type not in ('branch','cart','basket','clearCart','hold','resume','discard','preferences') then raise exception 'Read-only account' using errcode='42501'; end if;
 if membership='Cashier' and p_type not in ('branch','cart','basket','clearCart','hold','resume','discard','preferences','checkout','document','convertDocument','issueDocument','payDocument','openRegister','cashEntry','closeRegister','addCustomer','payBalance','placeOrder','pack','orderStatus','orderPaid') then raise exception 'Role does not allow this change' using errcode='42501'; end if;
 select * into previous from public.business_commands where business_id=p_business and request_id=p_request;
 if found then
  if previous.user_id<>p_user or previous.command_hash<>p_hash then
   raise exception 'Request ID was already used for a different command' using errcode='23505';
  end if;
  return previous.result || jsonb_build_object('duplicate',true);
 end if;
 if p_type not in ('updateProfile','preferences') and not public.business_features_unlocked(p_business) then raise exception 'Business details required' using errcode='42501'; end if;
 if current_revision<>p_revision then return jsonb_build_object('conflict',true); end if;
 update public.business_records set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business;
 insert into public.user_workspaces(business_id,user_id,state) values(p_business,p_user,p_workspace)
 on conflict(business_id,user_id) do update set state=excluded.state;
 insert into public.business_commands(business_id,user_id,request_id,command_hash,command_type,result,input)
 values(p_business,p_user,p_request,p_hash,p_type,p_result || jsonb_build_object('revision',current_revision+1),p_input);
 return p_result || jsonb_build_object('revision',current_revision+1);
end; $$;


create or replace function public.commit_customer_order(p_business uuid,p_user uuid,p_revision bigint,p_request uuid,p_hash text,p_state jsonb,p_result jsonb,p_order integer,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rev bigint; previous public.business_commands;
begin
 select revision into rev from public.business_records where business_id=p_business for update;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Confirmed account required' using errcode='42501'; end if;
 select * into previous from public.business_commands where business_id=p_business and request_id=p_request;
 if found then
  if previous.user_id<>p_user or previous.command_hash<>p_hash then raise exception 'Request ID already used' using errcode='23505'; end if;
  return previous.result || jsonb_build_object('duplicate',true);
 end if;
 if not public.business_features_unlocked(p_business) then raise exception 'Business details required' using errcode='42501'; end if;
 if rev<>p_revision then return jsonb_build_object('conflict',true); end if;
 update public.business_records set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business;
 insert into public.customer_order_access values(p_business,p_user,p_order);
 insert into public.business_commands(business_id,user_id,request_id,command_hash,command_type,result,input) values(p_business,p_user,p_request,p_hash,'customerOrder',p_result,p_input);
 return p_result;
end; $$;

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
 if p_action<>'withdraw' and not public.business_features_unlocked(p_business) then raise exception 'Business details required' using errcode='42501'; end if;
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