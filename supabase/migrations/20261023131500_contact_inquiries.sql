create table public.contact_inquiries (
 id uuid primary key default gen_random_uuid(),
 name text not null,email text not null,business text not null,topic text not null,message text not null,
 rate_key text not null,created_at timestamptz not null default now()
);
create index contact_inquiries_rate on public.contact_inquiries(rate_key,created_at);
alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from anon,authenticated;
grant all on public.contact_inquiries to service_role;
create or replace function public.submit_contact(p_name text,p_email text,p_business text,p_topic text,p_message text,p_rate text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_rate,0));
 if (select count(*) from public.contact_inquiries where rate_key=p_rate and created_at>now()-interval '1 hour')>=3 then return jsonb_build_object('limited',true); end if;
 if (select count(*) from public.contact_inquiries where lower(email)=lower(p_email) and created_at>now()-interval '1 day')>=10 then return jsonb_build_object('limited',true); end if;
 insert into public.contact_inquiries(name,email,business,topic,message,rate_key) values(p_name,p_email,p_business,p_topic,p_message,p_rate) returning id into request_id;
 return jsonb_build_object('id',request_id);
end; $$;
revoke all on function public.submit_contact(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_contact(text,text,text,text,text,text) to service_role;
