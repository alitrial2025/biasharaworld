alter table public.business_commands add column input jsonb;
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
 if rev<>p_revision then return jsonb_build_object('conflict',true); end if;
 update public.business_records set state=p_state,revision=revision+1,updated_at=now() where business_id=p_business;
 insert into public.customer_order_access values(p_business,p_user,p_order);
 insert into public.business_commands(business_id,user_id,request_id,command_hash,command_type,result,input) values(p_business,p_user,p_request,p_hash,'customerOrder',p_result,p_input);
 return p_result;
end; $$;

drop function public.commit_business_command(uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb);
drop function public.commit_customer_order(uuid,uuid,bigint,uuid,text,jsonb,jsonb,integer);
revoke all on function public.commit_business_command(uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.commit_customer_order(uuid,uuid,bigint,uuid,text,jsonb,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.commit_business_command(uuid,uuid,bigint,uuid,text,text,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.commit_customer_order(uuid,uuid,bigint,uuid,text,jsonb,jsonb,integer,jsonb) to service_role;
