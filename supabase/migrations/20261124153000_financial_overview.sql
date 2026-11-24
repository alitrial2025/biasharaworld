create function public.financial_workspace_totals(target_business uuid, actor uuid, start_on date, end_on date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'payables', coalesce((
      select jsonb_object_agg(bucket, amount) from (
        select case
          when due_on >= end_on then 'current'
          when end_on - due_on <= 30 then 'overdue30'
          when end_on - due_on <= 60 then 'overdue60'
          when end_on - due_on <= 90 then 'overdue90'
          else 'overdue91'
        end as bucket, sum(quote_minor) as amount
        from public.supplier_exchanges
        where buyer_id = target_business and status = 'invoiced'
        group by 1
      ) rows
    ), '{}'::jsonb),
    'online', coalesce((
      select jsonb_object_agg(channel, amount) from (
        select channel, sum(amount_minor) as amount from public.customer_order_payments
        where business_id = target_business
          and channel is not null
          and paid_at >= (start_on::timestamp at time zone 'Africa/Nairobi')
          and paid_at < ((end_on + 1)::timestamp at time zone 'Africa/Nairobi')
        group by channel
      ) rows
    ), '{}'::jsonb)
  )
  where exists (
    select 1 from public.business_members
    where business_id = target_business and user_id = actor and role in ('Owner', 'Manager')
  );
$$;
revoke all on function public.financial_workspace_totals(uuid, uuid, date, date)
  from public, anon, authenticated;
grant execute on function public.financial_workspace_totals(uuid, uuid, date, date) to service_role;
