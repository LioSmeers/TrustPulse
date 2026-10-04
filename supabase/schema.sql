-- TrustPulse initial migration. Run once in the SQL Editor of the new project.
-- No sample customers are imported. Existing tables/data are not deleted.
begin;

create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 1 and 100),
 logo_url text not null default '', accent_color text not null default '#315F9A' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
 google_review_url text not null default '' check (google_review_url = '' or google_review_url ~ '^https://'),
 phone text not null default '', email text not null default '',
 default_sms text not null default E'Dag {naam}, bedankt voor je bezoek aan {bedrijf}!\nHoe was je ervaring?\nBeoordeel ons via:\n{link}',
 notify_feedback boolean not null default false
);
create table if not exists public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 business_id uuid not null references public.businesses(id), name text not null default '', email text not null default '',
 role text not null default 'owner' check (role in ('owner','member'))
);
create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 name text not null check (length(name) between 1 and 100), phone text not null default '', created_at timestamptz not null default now(),
 unique(id, business_id)
);
create table if not exists public.invitations (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null,
 business_id uuid not null references public.businesses(id), token text not null unique check (token ~ '^[a-f0-9]{32}$'),
 status text not null default 'sent' check (status in ('sent','opened','completed')),
 sent_at timestamptz not null default now(), opened_at timestamptz, message text not null check (length(message) between 1 and 640),
 expires_at timestamptz not null default (now() + interval '30 days'), provider_id text,
 foreign key(customer_id, business_id) references public.customers(id, business_id)
);
create table if not exists public.ratings (
 id uuid primary key default gen_random_uuid(), invitation_id uuid not null unique references public.invitations(id),
 stars integer not null check (stars between 1 and 5), created_at timestamptz not null default now()
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null,
 business_id uuid not null references public.businesses(id), stars integer not null check (stars between 1 and 5),
 text text not null, platform text not null check (platform in ('Google','TrustPulse')), created_at timestamptz not null default now(),
 foreign key(customer_id, business_id) references public.customers(id, business_id)
);
create table if not exists public.feedback (
 id uuid primary key default gen_random_uuid(), rating_id uuid not null unique references public.ratings(id),
 message text not null check (length(message) between 1 and 2000), contact_allowed boolean not null default false,
 status text not null default 'open' check (status in ('open','resolved')), created_at timestamptz not null default now()
);
create table if not exists public.invitation_request_limits (
 invitation_id uuid primary key references public.invitations(id) on delete cascade,
 window_start timestamptz not null, requests integer not null
);
create index if not exists customers_business_idx on public.customers(business_id);
create index if not exists invitations_business_idx on public.invitations(business_id, sent_at desc);
create index if not exists reviews_business_idx on public.reviews(business_id, created_at desc);

-- Direct API table access is closed, even when automatic table exposure is enabled.
-- Only the explicitly authorized functions below are exposed to the app.
alter table public.businesses enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.invitations enable row level security;
alter table public.ratings enable row level security;
alter table public.reviews enable row level security;
alter table public.feedback enable row level security;
alter table public.invitation_request_limits enable row level security;
revoke all on public.businesses, public.users, public.customers, public.invitations, public.ratings, public.reviews, public.feedback, public.invitation_request_limits from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Provision one workspace for the verified authenticated user; never accept a tenant ID from the browser.
create or replace function public.ensure_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bid uuid; account auth.users%rowtype;
begin
 if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 select business_id into bid from public.users where id = uid;
 if bid is not null then return bid; end if;
 select * into account from auth.users where id = uid;
 if not found then raise exception 'Authentication required' using errcode = '42501'; end if;
 insert into public.businesses(name,email) values (
  left(coalesce(nullif(trim(account.raw_user_meta_data->>'business_name'),''),'Mijn zaak'),100),coalesce(account.email,'')) returning id into bid;
 insert into public.users(id,business_id,name,email,role) values (
  uid,bid,left(coalesce(account.raw_user_meta_data->>'name','Zaakvoerder'),100),coalesce(account.email,''),'owner');
 return bid;
end; $$;
revoke all on function public.ensure_workspace() from public, anon, authenticated;

create or replace function public.load_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
 bid := public.ensure_workspace();
 return jsonb_build_object(
  'business', (select to_jsonb(b) from public.businesses b where b.id = bid),
  'customers', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id) from public.customers c where c.business_id = bid),'[]'::jsonb),
  'invitations', coalesce((select jsonb_agg(to_jsonb(i) order by i.sent_at desc,i.id) from public.invitations i where i.business_id = bid),'[]'::jsonb),
  'ratings', coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r join public.invitations i on i.id = r.invitation_id where i.business_id = bid),'[]'::jsonb),
  'reviews', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.reviews r where r.business_id = bid),'[]'::jsonb),
  'feedback', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.feedback f join public.ratings r on r.id = f.rating_id join public.invitations i on i.id = r.invitation_id where i.business_id = bid),'[]'::jsonb)
 );
end; $$;
revoke all on function public.load_workspace() from public, anon;
grant execute on function public.load_workspace() to authenticated;

-- Apply only changed fields in a single transaction. Ratings/public feedback cannot be forged here.
create or replace function public.save_workspace(p_changes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare bid uuid; item jsonb; business jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 select business_id into bid from public.users where id = auth.uid();
 if bid is null then raise exception 'Workspace not found' using errcode = '42501'; end if;
 perform 1 from public.businesses where id = bid for update;
 if jsonb_typeof(p_changes) <> 'object' or octet_length(p_changes::text) > 4000000 then raise exception 'Invalid changes'; end if;
 business := p_changes->'business';
 if business is not null and business <> 'null'::jsonb then
  if business->>'id' is distinct from bid::text then raise exception 'Invalid workspace' using errcode = '42501'; end if;
  if length(business->>'logoUrl') > 3000000 or (business->>'logoUrl' <> '' and business->>'logoUrl' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Invalid logo'; end if;
  if length(business->>'defaultSms') not between 1 and 480 or length(business->>'phone') > 40 or length(business->>'email') > 254 then raise exception 'Invalid settings'; end if;
  update public.businesses set name=trim(business->>'name'),logo_url=business->>'logoUrl',accent_color=business->>'accentColor',
   google_review_url=business->>'googleReviewUrl',phone=business->>'phone',email=business->>'email',
   default_sms=business->>'defaultSms',notify_feedback=(business->>'notifyFeedback')::boolean where id=bid;
 end if;
 if jsonb_array_length(coalesce(p_changes->'customers','[]'::jsonb)) > 100 or jsonb_array_length(coalesce(p_changes->'invitations','[]'::jsonb)) > 100 then raise exception 'Too many changes'; end if;
 for item in select value from jsonb_array_elements(coalesce(p_changes->'customers','[]'::jsonb)) loop
  if coalesce(item->>'phone','') <> '' and item->>'phone' !~ '^\+32[1-9][0-9]{7,8}$' then raise exception 'Invalid phone'; end if;
  insert into public.customers(id,business_id,name,phone) values ((item->>'id')::uuid,bid,trim(item->>'name'),coalesce(item->>'phone',''));
 end loop;
 for item in select value from jsonb_array_elements(coalesce(p_changes->'invitations','[]'::jsonb)) loop
  if not exists (select 1 from public.customers where id=(item->>'customerId')::uuid and business_id=bid) then raise exception 'Invalid customer' using errcode = '42501'; end if;
  insert into public.invitations(id,customer_id,business_id,token,message) values (
   (item->>'id')::uuid,(item->>'customerId')::uuid,bid,item->>'token',item->>'message');
 end loop;
 for item in select value from jsonb_array_elements(coalesce(p_changes->'feedback','[]'::jsonb)) loop
  update public.feedback f set status=item->>'status' from public.ratings r,public.invitations i
   where f.id=(item->>'id')::uuid and f.rating_id=r.id and r.invitation_id=i.id and i.business_id=bid;
  if not found then raise exception 'Invalid feedback' using errcode = '42501'; end if;
 end loop;
end; $$;
revoke all on function public.save_workspace(jsonb) from public, anon;
grant execute on function public.save_workspace(jsonb) to authenticated;

-- Bearer-token customer access returns branding only: never customers, phone numbers, email, or other invitations.
create or replace function public.public_invitation(
 p_token text, p_action text default 'load', p_stars integer default null, p_message text default null, p_contact boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare invitation public.invitations%rowtype; rating public.ratings%rowtype; request_count integer;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{32}$' then return null; end if;
 if p_action is null or p_action not in ('load','opened','rate','feedback') then raise exception 'Invalid action'; end if;
 select * into invitation from public.invitations where token=p_token and expires_at>now() for update;
 if not found then return null; end if;
 insert into public.invitation_request_limits(invitation_id,window_start,requests) values (invitation.id,now(),1)
 on conflict(invitation_id) do update set
  requests=case when public.invitation_request_limits.window_start < now()-interval '1 minute' then 1 else public.invitation_request_limits.requests+1 end,
  window_start=case when public.invitation_request_limits.window_start < now()-interval '1 minute' then now() else public.invitation_request_limits.window_start end
 returning requests into request_count;
 if request_count > 60 then raise exception 'Too many requests'; end if;
 if p_action='opened' and invitation.status='sent' then
  update public.invitations set status='opened',opened_at=now() where id=invitation.id returning * into invitation;
 elsif p_action='rate' then
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Invalid rating'; end if;
  insert into public.ratings(invitation_id,stars) values (invitation.id,p_stars)
   on conflict(invitation_id) do update set stars=excluded.stars;
  update public.invitations set status='completed',opened_at=coalesce(opened_at,now()) where id=invitation.id returning * into invitation;
 elsif p_action='feedback' then
  if p_message is null or length(trim(p_message)) not between 1 and 2000 or p_contact is null then raise exception 'Invalid feedback'; end if;
  select * into rating from public.ratings where invitation_id=invitation.id;
  if not found then raise exception 'A rating is required'; end if;
  insert into public.feedback(rating_id,message,contact_allowed) values (rating.id,trim(p_message),p_contact)
   on conflict(rating_id) do update set message=excluded.message,contact_allowed=excluded.contact_allowed,status='open';
 end if;
 select * into rating from public.ratings where invitation_id=invitation.id;
 return jsonb_build_object(
  'business',(select jsonb_build_object('id',b.id,'name',b.name,'logo_url',b.logo_url,'accent_color',b.accent_color,'google_review_url',b.google_review_url) from public.businesses b where b.id=invitation.business_id),
  'invitation',jsonb_build_object('id',invitation.id,'business_id',invitation.business_id,'token',invitation.token,'status',invitation.status,'sent_at',invitation.sent_at,'opened_at',invitation.opened_at),
  'rating',case when rating.id is null then null else to_jsonb(rating) end
 );
end; $$;
revoke all on function public.public_invitation(text,text,integer,text,boolean) from public;
grant execute on function public.public_invitation(text,text,integer,text,boolean) to anon, authenticated;
commit;
