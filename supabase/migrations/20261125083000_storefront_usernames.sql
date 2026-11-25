create table public.business_storefronts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  username text not null unique check (
    char_length(username) between 3 and 40 and username ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and username !~ '^[a-f0-9]{24}$'
    and username not in ('about','admin','api','app','auth','billing','blog','checkout','contact','dashboard',
      'download','downloads','features','forgot-password','help','images','login','logout','onboarding','portal',
      'pricing','privacy','reset-password','resources','settings','shop','shops','signup','solutions','status','support','terms','www')
  ),
  revision bigint not null default 1,
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  live jsonb check (live is null or jsonb_typeof(live) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.business_storefronts enable row level security;
revoke all on public.business_storefronts from public, anon, authenticated, service_role;
grant select on public.business_storefronts to service_role;

create function public.save_business_storefront(
  target_business uuid, actor uuid, expected_revision bigint, chosen_username text, changes jsonb,
  mode text, workspace_revision bigint, request_id uuid, input_hash text, business_state jsonb,
  personal_state jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  existing public.business_storefronts%rowtype;
  result jsonb;
  previous public.business_commands%rowtype;
begin
  perform 1 from public.business_records where business_id=target_business for update;
  if not found or not exists(select 1 from public.businesses where id=target_business and owner_id=actor) then
    raise exception 'Only the business owner can manage the storefront' using errcode='42501';
  end if;
  select * into existing from public.business_storefronts where business_id=target_business;
  if mode in ('publish','unpublish') then
    select * into previous from public.business_commands where business_id=target_business
      and public.business_commands.request_id = save_business_storefront.request_id;
    if found then
      if previous.user_id <> actor or previous.command_hash <> input_hash then
        raise exception 'Request ID already in use' using errcode='40001';
      end if;
      return to_jsonb(existing);
    end if;
  end if;
  if coalesce(existing.revision,0) <> expected_revision then
    raise exception 'Storefront revision changed' using errcode='40001';
  end if;

  if mode='save' then
    if existing.live is not null and existing.username <> chosen_username then
      raise exception 'A published username is permanent' using errcode='23514';
    end if;
    insert into public.business_storefronts(business_id,username,draft)
    values(target_business,chosen_username,changes)
    on conflict (business_id) do update set username=excluded.username,draft=excluded.draft,
      revision=public.business_storefronts.revision+1,updated_at=now()
    returning * into existing;
  elsif mode in ('publish','unpublish') and existing.username is not null then
    if mode='publish' and public.merchant_verification_status(target_business) <> 'verified' then
      raise exception 'Merchant verification is required' using errcode='42501';
    end if;
    result := public.commit_business_command(target_business, actor, workspace_revision, request_id, input_hash, 'shop',
      business_state, personal_state, jsonb_build_object('message','Updated storefront.'),
      jsonb_build_object('command',jsonb_build_object('type','shop','published',mode='publish')));
    if coalesce((result->>'conflict')::boolean,false) then
      raise exception 'Workspace revision changed' using errcode='40001';
    end if;
    update public.business_storefronts set live=case when mode='publish' then draft else live end,
      revision=revision+1,updated_at=now()
    where business_id=target_business returning * into existing;
  else
    raise exception 'Invalid storefront action' using errcode='22023';
  end if;
  return to_jsonb(existing);
end; $$;
revoke all on function public.save_business_storefront(uuid,uuid,bigint,text,jsonb,text,bigint,uuid,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.save_business_storefront(uuid,uuid,bigint,text,jsonb,text,bigint,uuid,text,jsonb,jsonb)
  to service_role;
