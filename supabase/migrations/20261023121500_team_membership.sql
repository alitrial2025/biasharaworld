create or replace function public.claim_business_invites(p_user uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare invitation record; doc jsonb; new_id integer;
begin
 if not exists(select 1 from auth.users where id=p_user and lower(email)=lower(p_email) and email_confirmed_at is not null) then return; end if;
 for invitation in select * from public.business_invites where lower(email)=lower(p_email) order by business_id for update loop
  select state into doc from public.business_records where business_id=invitation.business_id for update;
  if not exists(select 1 from public.business_members where business_id=invitation.business_id and user_id=p_user) then
   insert into public.business_members values(invitation.business_id,p_user,invitation.role);
   select coalesce(max((m->>'id')::integer),0)+1 into new_id from jsonb_array_elements(doc->'members') m;
   doc=jsonb_set(doc,'{members}',coalesce((select jsonb_agg(case when lower(m->>'email')=lower(p_email) then m||jsonb_build_object('status','Active','userId',p_user) else m end) from jsonb_array_elements(doc->'members') m),'[]'));
   update public.business_records set state=doc,revision=revision+1,updated_at=now() where business_id=invitation.business_id;
  end if;
  delete from public.business_invites where id=invitation.id;
 end loop;
end; $$;
revoke all on function public.claim_business_invites(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_business_invites(uuid,text) to service_role;

-- A trigger applies team changes inside the same versioned business transaction.
create or replace function public.synchronize_business_team()
returns trigger language plpgsql security definer set search_path='' as $$
declare member jsonb; owner uuid;
begin
 if new.state->'members' is not distinct from old.state->'members' then return new; end if;
 select owner_id into owner from public.businesses where id=new.business_id;
 if not exists(select 1 from jsonb_array_elements(new.state->'members') m where m->>'userId'=owner::text and m->>'role'='Owner' and m->>'status'='Active') then raise exception 'The business owner must remain active'; end if;
 delete from public.business_invites where business_id=new.business_id;
 for member in select * from jsonb_array_elements(new.state->'members') loop
  if member->>'status'='Invited' then
   insert into public.business_invites(business_id,email,role,invited_by) values(new.business_id,lower(member->>'email'),member->>'role',owner);
  elsif member->>'userId' is not null and (member->>'userId')::uuid<>owner then
   update public.business_members set role=member->>'role' where business_id=new.business_id and user_id=(member->>'userId')::uuid;
  end if;
 end loop;
 delete from public.business_members where business_id=new.business_id and user_id<>owner and not exists(select 1 from jsonb_array_elements(new.state->'members') m where m->>'userId'=business_members.user_id::text and m->>'status'='Active');
 return new;
end; $$;
create trigger synchronize_team after update of state on public.business_records for each row execute function public.synchronize_business_team();
