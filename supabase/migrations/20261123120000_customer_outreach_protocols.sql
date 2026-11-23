-- Per-customer outreach protocols (monthly / quarterly / first-time order)
alter table public.customers
  add column if not exists outreach_protocol text not null default 'none',
  add column if not exists protocol_anchor date,
  add column if not exists protocol_meta jsonb not null default '{}'::jsonb;

comment on column public.customers.outreach_protocol is 'none | monthly | quarterly | first_time_order';
comment on column public.customers.protocol_anchor is 'Order/start date for first_time_order protocol';
comment on column public.customers.protocol_meta is 'e.g. fto_7_done, fto_30_done, last_protocol_done';

alter table public.reminders
  add column if not exists source text not null default 'manual',
  add column if not exists protocol_step text;

comment on column public.reminders.source is 'manual | protocol';
comment on column public.reminders.protocol_step is 'monthly | quarterly | fto_7 | fto_30';