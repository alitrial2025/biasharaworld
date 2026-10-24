-- Keep database readiness checks aligned with the parsed JavaScript profile.
-- Applied migrations are immutable; these replacements preserve existing access policies.
create or replace function public.readiness_utf16_length(value text)
returns integer language sql immutable strict set search_path='' as $$
 select length(regexp_replace(value,U&'[\+010000-\+10FFFF]','..','g'));
$$;
revoke all on function public.readiness_utf16_length(text) from public,anon,authenticated;
grant execute on function public.readiness_utf16_length(text) to service_role;
create or replace function public.business_readiness_valid(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $readiness$
declare k text; n numeric; v jsonb := p;
begin
 if p is null or jsonb_typeof(p)<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(p))<>15 or exists(select 1 from jsonb_object_keys(p) as keys(key) where keys.key not in ('legalName','tradingName','contactName','phone','email','country','businessType','businessAddress','registrationStatus','registrationNumber','yearsTrading','employees','revenueBand','tools','declaration')) then return false; end if;
 foreach k in array array['legalName','tradingName','contactName','phone','email','businessType','businessAddress','country','registrationStatus','registrationNumber','revenueBand'] loop
  if jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
 end loop;
 foreach k in array array['legalName','tradingName','contactName','phone','email','businessType','businessAddress','registrationNumber'] loop
  v=jsonb_set(v,array[k],to_jsonb(btrim(v->>k,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')));
 end loop;
 foreach k in array array['legalName','tradingName','contactName','phone','email','businessType','businessAddress'] loop
  if length(btrim(v->>k))=0 then return false; end if;
 end loop;
 if public.readiness_utf16_length(v->>'legalName')>200 or public.readiness_utf16_length(v->>'tradingName')>200 or public.readiness_utf16_length(v->>'contactName')>200 or public.readiness_utf16_length(v->>'email')>200 or public.readiness_utf16_length(v->>'businessType')>100 or public.readiness_utf16_length(v->>'businessAddress')>400 or public.readiness_utf16_length(v->>'registrationNumber')>100 then return false; end if;
 if v->>'country'<>'KE' or v->>'registrationStatus' not in ('registered','unregistered','in_progress') or v->>'revenueBand' not in ('prefer_not_to_say','under_50000','50000_250000','250000_1000000','over_1000000') then return false; end if;
 if v->>'registrationStatus'='registered' and length(btrim(v->>'registrationNumber'))=0 then return false; end if;
 if v->>'email' !~ $email$^([A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$$email$ or translate(v->>'phone',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF',repeat(' ',25)) !~ '^\+?[0-9 ().-]{7,30}$' or length(regexp_replace(v->>'phone','[^0-9]','','g')) not between 7 and 15 then return false; end if;
 if v->'declaration'<>'true'::jsonb or jsonb_typeof(v->'tools') is distinct from 'array' then return false; end if;
 if jsonb_array_length(v->'tools')>6 or exists(select 1 from jsonb_array_elements(v->'tools') t where jsonb_typeof(t)<>'string' or (t #>> '{}') not in ('Sales','Stock','Customers','Suppliers','Reports','Funding')) then return false; end if;
 foreach k in array array['yearsTrading','employees'] loop
  if jsonb_typeof(v->k) is distinct from 'number' then return false; end if;
  n=(v->>k)::numeric;
  if n<>trunc(n) or (k='yearsTrading' and n not between 0 and 100) or (k='employees' and n not between 1 and 100000) then return false; end if;
 end loop;
 return true;
end; $readiness$;
revoke all on function public.business_readiness_valid(jsonb) from public,anon,authenticated;
grant execute on function public.business_readiness_valid(jsonb) to service_role;
create or replace function public.business_features_unlocked(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_verifications v where v.business_id=p_business and v.status='submitted'
 and v.consent_version='2026-10-24' and v.consented_at is not null and isfinite(v.consented_at) and public.business_readiness_valid(v.profile));
$$;
revoke all on function public.business_features_unlocked(uuid) from public,anon;
grant execute on function public.business_features_unlocked(uuid) to authenticated,service_role;
