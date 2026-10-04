-- Apply after schema.sql. No existing invitations are sent by this migration.
begin;
alter table public.invitations add column if not exists channel text not null default 'link' check (channel in ('link','sms'));
alter table public.invitations add column if not exists delivery_status text check (delivery_status in ('submitting','unknown','accepted','queued','sending','sent','delivered','undelivered','failed','canceled'));
alter table public.invitations add column if not exists delivery_error text;
alter table public.invitations add column if not exists delivery_updated_at timestamptz;

-- Server-only reservation, after the route verifies the caller with Supabase Auth.
-- Lock the business so concurrent requests share the same rate limit.
create or replace function public.reserve_sms(p_user_id uuid, p_token text, p_name text, p_phone text, p_message text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare bid uuid; cid uuid; invitation public.invitations%rowtype;
begin
 select business_id into bid from public.users where id=p_user_id;
 if bid is null then raise exception 'Workspace not found'; end if;
 perform 1 from public.businesses where id=bid for update;
 if p_token is null or p_token !~ '^[a-f0-9]{32}$' or p_name is null or length(trim(p_name)) not between 1 and 80
  or p_phone is null or p_phone !~ '^\+324[0-9]{8}$' or p_message is null or length(p_message) not between 1 and 640 then raise exception 'Invalid SMS'; end if;
 select * into invitation from public.invitations where token=p_token;
 if found then
  if invitation.business_id <> bid or invitation.channel <> 'sms' then raise exception 'Invalid invitation'; end if;
  return jsonb_build_object('send',false,'status',invitation.delivery_status);
 end if;
 if (select count(*) from public.invitations where business_id=bid and channel='sms' and sent_at>now()-interval '1 minute') >= 10
  or (select count(*) from public.invitations where business_id=bid and channel='sms' and sent_at>now()-interval '1 day') >= 100 then raise exception 'SMS limit reached'; end if;
 select id into cid from public.customers where business_id=bid and phone=p_phone order by created_at limit 1;
 if cid is null then insert into public.customers(business_id,name,phone) values(bid,trim(p_name),p_phone) returning id into cid; end if;
 insert into public.invitations(customer_id,business_id,token,message,channel,delivery_status,delivery_updated_at)
 values(cid,bid,p_token,p_message,'sms','submitting',now());
 return jsonb_build_object('send',true,'status','submitting');
end; $$;
revoke all on function public.reserve_sms(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_sms(uuid,text,text,text,text) to service_role;

-- Provider callbacks can arrive before the create-message response and out of order.
create or replace function public.record_sms_result(p_token text, p_sid text, p_status text, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare invitation public.invitations%rowtype; stages text[] := array['submitting','unknown','accepted','queued','sending','sent','delivered'];
begin
 if p_status is null or p_status not in ('unknown','accepted','queued','sending','sent','delivered','undelivered','failed','canceled') then raise exception 'Invalid status'; end if;
 if p_sid is not null and p_sid !~ '^SM[a-fA-F0-9]{32}$' then raise exception 'Invalid provider ID'; end if;
 select * into invitation from public.invitations where token=p_token and channel='sms' for update;
 if not found then raise exception 'Invalid invitation'; end if;
 if invitation.provider_id is not null and p_sid is distinct from invitation.provider_id then return; end if;
 if invitation.delivery_status in ('delivered','undelivered','failed','canceled') then return; end if;
 if coalesce(array_position(stages,p_status),8) < coalesce(array_position(stages,invitation.delivery_status),0) then return; end if;
 update public.invitations set provider_id=coalesce(provider_id,p_sid),delivery_status=p_status,
  delivery_error=left(p_error,40),delivery_updated_at=now() where id=invitation.id;
end; $$;
revoke all on function public.record_sms_result(text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_sms_result(text,text,text,text) to service_role;

create or replace function public.sms_ready() returns boolean language sql security definer set search_path='' as $$select true$$;
revoke all on function public.sms_ready() from public,anon,authenticated;
grant execute on function public.sms_ready() to service_role;
commit;
