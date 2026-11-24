alter table public.customer_order_payments
  drop constraint customer_order_payments_channel_check,
  add column allowed_channels text[] not null default array['card', 'mobile_money'],
  add constraint customer_order_payments_allowed_channels_check check (
    cardinality(allowed_channels) > 0
    and array_position(allowed_channels, null) is null
    and allowed_channels <@ array['card', 'mobile_money', 'bank_transfer']
  ),
  add constraint customer_order_payments_channel_check check (
    channel is null or channel = any(allowed_channels)
  );
