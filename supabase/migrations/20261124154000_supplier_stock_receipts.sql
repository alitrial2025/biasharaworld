create table public.supplier_stock_receipts (
  exchange_id uuid primary key references public.supplier_exchanges(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch text not null,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default clock_timestamp()
);
alter table public.supplier_stock_receipts enable row level security;
revoke all on public.supplier_stock_receipts from public, anon, authenticated, service_role;
grant select on public.supplier_stock_receipts to service_role;

create function public.confirm_supplier_stock_receipt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  exchange uuid := (new.input #>> '{command,id}')::uuid;
  exchange_version integer := (new.input #>> '{command,version}')::integer;
begin
  perform 1 from public.supplier_exchanges
  where id = exchange and buyer_id = new.business_id and version = exchange_version
    and status in ('received', 'invoiced', 'paid')
  for share;
  if not found then
    raise exception 'Supplier receipt is unavailable or changed' using errcode = '40001';
  end if;

  insert into public.supplier_stock_receipts (exchange_id, business_id, branch, recorded_by)
  values (exchange, new.business_id, new.input #>> '{command,branch}', new.user_id);
  return new;
end;
$$;
revoke all on function public.confirm_supplier_stock_receipt() from public, anon, authenticated, service_role;

create trigger supplier_stock_once before insert on public.business_commands
  for each row when (new.command_type = 'receiveSupplierStock')
  execute function public.confirm_supplier_stock_receipt();

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
 if membership='Cashier' and p_type not in ('branch','cart','basket','clearCart','hold','resume','discard','preferences','checkout','document','convertDocument','issueDocument','payDocument','invoicePayment','openRegister','cashEntry','closeRegister','addCustomer','payBalance','placeOrder','pack','orderStatus','orderPaid') then raise exception 'Role does not allow this change' using errcode='42501'; end if;
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
