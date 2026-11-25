-- Align hosted databases that still use the legacy business-details gate on this RPC.
-- Merchant identity and company verification remain enforced by the trigger on customer_order_access.
-- The existing RPC requires a confirmed customer email and returns completed retries before writing.
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
 if rev<>p_revision then return jsonb_build_object('conflict',true); end if;
 update public.business_records set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business;
 insert into public.customer_order_access values(p_business,p_user,p_order);
 insert into public.business_commands(business_id,user_id,request_id,command_hash,command_type,result,input) values(p_business,p_user,p_request,p_hash,'customerOrder',p_result,p_input);
 return p_result;
end; $$;
