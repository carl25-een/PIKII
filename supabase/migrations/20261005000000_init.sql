-- Pikii: pooled parcel delivery from Kariakoo shops to neighbourhood agent points.
-- All writes go through the security-definer functions at the bottom; tables only expose reads via RLS.

create type public.user_role as enum ('shop', 'staff', 'rider', 'agent');
create type public.parcel_status as enum ('booked', 'at_sort', 'on_route', 'at_agent', 'collected');
create type public.parcel_size as enum ('small', 'medium');
create type public.fee_payer as enum ('shop', 'customer');
create type public.zone as enum ('near', 'middle', 'far');

create table public.settings (
  key text primary key,
  value text not null
);

create table public.routes (
  id text primary key,
  name text not null,
  sort int not null default 0
);

create table public.zone_fees (
  zone public.zone primary key,
  fee_tzs int not null check (fee_tzs > 0)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  route_id text not null references public.routes (id),
  place text not null,
  host text not null,
  zone public.zone not null,
  stop_order int not null default 0,
  opening_hours text not null default '07:00–21:00',
  phone text,
  active boolean not null default true
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text,
  shop_id uuid references public.shops (id),
  agent_id uuid references public.agents (id),
  route_id text references public.routes (id),
  created_at timestamptz not null default now(),
  constraint shop_has_shop check (role <> 'shop' or shop_id is not null),
  constraint agent_has_agent check (role <> 'agent' or agent_id is not null)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  route_id text not null references public.routes (id),
  rider_id uuid not null references public.profiles (id),
  parcel_count int not null,
  started_at timestamptz not null default now()
);

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  shop_id uuid not null references public.shops (id),
  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_phone text not null check (customer_phone ~ '^255[67][0-9]{8}$'),
  agent_id uuid not null references public.agents (id),
  size public.parcel_size not null default 'small',
  payer public.fee_payer not null default 'shop',
  fee_tzs int not null,
  fee_paid boolean not null default false,
  status public.parcel_status not null default 'booked',
  collection_code text not null default lpad(floor(random() * 10000)::int::text, 4, '0'),
  tracking_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  run_id uuid references public.runs (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parcels_shop_idx on public.parcels (shop_id, created_at desc);
create index parcels_status_idx on public.parcels (status);
create index parcels_agent_idx on public.parcels (agent_id, status);
create index parcels_run_idx on public.parcels (run_id);

create table public.parcel_events (
  id bigint generated always as identity primary key,
  parcel_id uuid not null references public.parcels (id) on delete cascade,
  status public.parcel_status not null,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index parcel_events_parcel_idx on public.parcel_events (parcel_id, created_at);

create table public.sms_outbox (
  id bigint generated always as identity primary key,
  parcel_id uuid references public.parcels (id) on delete set null,
  phone text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index sms_outbox_queued_idx on public.sms_outbox (created_at) where status = 'queued';

-- ---------- helpers ----------

create function public.my_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create function public.require_role(wanted public.user_role)
returns public.profiles
language plpgsql stable security definer set search_path = public
as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> wanted then
    raise exception 'not_allowed' using hint = 'This action needs a ' || wanted || ' account.';
  end if;
  return me;
end;
$$;

-- Accepts 0712345678, 712345678, 255712345678 or +255 712 345 678.
create function public.normalize_tz_phone(raw text)
returns text
language plpgsql immutable
as $$
declare
  digits text := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
begin
  if digits ~ '^0[67][0-9]{8}$' then return '255' || substr(digits, 2); end if;
  if digits ~ '^[67][0-9]{8}$' then return '255' || digits; end if;
  if digits ~ '^255[67][0-9]{8}$' then return digits; end if;
  raise exception 'bad_phone' using hint = 'Enter a Tanzanian mobile number like 0712 345 678.';
end;
$$;

-- ---------- status events and SMS ----------

create function public.on_parcel_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  a public.agents;
  link text := coalesce((select value from public.settings where key = 'tracking_base_url'), '') || new.tracking_token;
  shop_name text := (select name from public.shops where id = new.shop_id);
  body text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  new.updated_at := now();
  insert into public.parcel_events (parcel_id, status, actor_id) values (new.id, new.status, auth.uid());

  select * into a from public.agents where id = new.agent_id;
  body := case new.status
    when 'on_route' then format('Pikii: Mzigo wako %s kutoka %s uko njiani kwenda %s. Your parcel is on its way. Fuatilia/Track: %s',
                                new.code, shop_name, a.place, link)
    when 'at_agent' then format('Pikii: Mzigo %s umefika kwa %s, %s. Code: %s. Chukua ndani ya siku 3. Ready for pickup, show code %s. %s',
                                new.code, a.host, a.place, new.collection_code, new.collection_code, link)
    when 'collected' then format('Pikii: Umechukua mzigo %s. Asante! You collected your parcel. Thank you.', new.code)
    else null
  end;
  if body is not null then
    insert into public.sms_outbox (parcel_id, phone, body) values (new.id, new.customer_phone, body);
  end if;
  return new;
end;
$$;

-- BEFORE so updated_at is set on the row; events reference the parcel id, which exists on insert because
-- the insert trigger below runs AFTER.
create trigger parcel_status_update before update of status on public.parcels
  for each row execute function public.on_parcel_status();

create function public.on_parcel_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.parcel_events (parcel_id, status, actor_id) values (new.id, new.status, auth.uid());
  return new;
end;
$$;

create trigger parcel_insert after insert on public.parcels
  for each row execute function public.on_parcel_insert();

-- ---------- actions ----------

create function public.book_parcel(
  p_customer_name text,
  p_customer_phone text,
  p_agent_id uuid,
  p_size public.parcel_size default 'small',
  p_payer public.fee_payer default 'shop'
)
returns public.parcels
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles := public.require_role('shop');
  fee int;
  new_code text;
  result public.parcels;
begin
  select z.fee_tzs into fee
    from public.agents a join public.zone_fees z on z.zone = a.zone
   where a.id = p_agent_id and a.active;
  if fee is null then
    raise exception 'unknown_agent' using hint = 'Pick an agent point from the list.';
  end if;

  loop
    new_code := 'PK-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.parcels where code = new_code);
  end loop;

  insert into public.parcels (code, shop_id, customer_name, customer_phone, agent_id, size, payer, fee_tzs, created_by)
  values (new_code, me.shop_id, trim(p_customer_name), public.normalize_tz_phone(p_customer_phone), p_agent_id,
          p_size, p_payer, fee, me.id)
  returning * into result;
  return result;
end;
$$;

create function public.check_in_parcel(p_code text, p_fee_collected boolean default false)
returns public.parcels
language plpgsql security definer set search_path = public
as $$
declare
  result public.parcels;
begin
  perform public.require_role('staff');
  update public.parcels
     set status = 'at_sort',
         fee_paid = fee_paid or (payer = 'shop' and p_fee_collected)
   where code = upper(trim(p_code)) and status = 'booked'
  returning * into result;
  if result.id is null then
    raise exception 'not_found' using hint = 'No booked parcel has that code. It may already be checked in.';
  end if;
  return result;
end;
$$;

create function public.route_board()
returns table (route_id text, route_name text, ready int, out_now int, min_run int)
language sql stable security definer set search_path = public
as $$
  select r.id, r.name,
         count(*) filter (where p.status = 'at_sort')::int,
         count(*) filter (where p.status = 'on_route')::int,
         coalesce((select value::int from public.settings where key = 'min_parcels_per_run'), 15)
    from public.routes r
    left join public.agents a on a.route_id = r.id
    left join public.parcels p on p.agent_id = a.id
   where (select role from public.profiles where id = auth.uid()) = 'staff'
   group by r.id, r.name, r.sort
   order by r.sort
$$;

create function public.send_run(p_route_id text, p_rider_id uuid, p_force boolean default false)
returns public.runs
language plpgsql security definer set search_path = public
as $$
declare
  min_run int := coalesce((select value::int from public.settings where key = 'min_parcels_per_run'), 15);
  ready int;
  result public.runs;
begin
  perform public.require_role('staff');
  if not exists (select 1 from public.profiles where id = p_rider_id and role = 'rider') then
    raise exception 'not_a_rider' using hint = 'Pick a rider for this run.';
  end if;
  select count(*) into ready
    from public.parcels p join public.agents a on a.id = p.agent_id
   where a.route_id = p_route_id and p.status = 'at_sort';
  if ready = 0 then
    raise exception 'empty_run' using hint = 'No parcels are waiting for this route.';
  end if;
  if ready < min_run and not p_force then
    raise exception 'run_too_small' using hint = format('This route has %s parcels; a run needs %s.', ready, min_run);
  end if;

  insert into public.runs (route_id, rider_id, parcel_count) values (p_route_id, p_rider_id, ready)
  returning * into result;

  update public.parcels p
     set status = 'on_route', run_id = result.id
    from public.agents a
   where a.id = p.agent_id and a.route_id = p_route_id and p.status = 'at_sort';
  return result;
end;
$$;

create function public.drop_at_agent(p_agent_id uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles := public.require_role('rider');
  n int;
begin
  update public.parcels p
     set status = 'at_agent'
    from public.runs r
   where r.id = p.run_id and r.rider_id = me.id
     and p.agent_id = p_agent_id and p.status = 'on_route';
  get diagnostics n = row_count;
  return n;
end;
$$;

create function public.hand_over(p_collection_code text, p_fee_collected boolean default false)
returns public.parcels
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles := public.require_role('agent');
  target public.parcels;
begin
  select * into target from public.parcels
   where agent_id = me.agent_id and status = 'at_agent' and collection_code = trim(p_collection_code)
   order by created_at
   limit 1;
  if target.id is null then
    raise exception 'code_not_found' using hint = 'That code does not match a parcel on your shelf. Ask the customer to check their latest Pikii SMS.';
  end if;
  if target.payer = 'customer' and not target.fee_paid and not p_fee_collected then
    raise exception 'fee_due' using hint = format('Collect TZS %s from the customer before handing over.', target.fee_tzs);
  end if;

  update public.parcels
     set status = 'collected', fee_paid = true
   where id = target.id
  returning * into target;
  return target;
end;
$$;

-- Public tracking for the link in the customer's SMS. Returns no phone numbers.
create function public.track_parcel(p_token text)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'code', p.code,
    'status', p.status,
    'customer_first_name', split_part(p.customer_name, ' ', 1),
    'shop', s.name,
    'agent_place', a.place,
    'agent_host', a.host,
    'opening_hours', a.opening_hours,
    'collection_code', case when p.status = 'at_agent' then p.collection_code end,
    'fee_due_tzs', case when p.payer = 'customer' and not p.fee_paid then p.fee_tzs end,
    'events', (select json_agg(json_build_object('status', e.status, 'at', e.created_at) order by e.created_at)
                 from public.parcel_events e where e.parcel_id = p.id)
  )
  from public.parcels p
  join public.shops s on s.id = p.shop_id
  join public.agents a on a.id = p.agent_id
  where p.tracking_token = p_token
$$;

-- ---------- row level security ----------

alter table public.settings enable row level security;
alter table public.routes enable row level security;
alter table public.zone_fees enable row level security;
alter table public.agents enable row level security;
alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.parcels enable row level security;
alter table public.parcel_events enable row level security;
alter table public.sms_outbox enable row level security;

create policy "signed in users read routes" on public.routes for select to authenticated using (true);
create policy "signed in users read fees" on public.zone_fees for select to authenticated using (true);
create policy "signed in users read agents" on public.agents for select to authenticated using (true);

create policy "own shop or staff" on public.shops for select to authenticated
  using (id = (public.my_profile()).shop_id or (public.my_profile()).role = 'staff');

create policy "self or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or (public.my_profile()).role = 'staff');

create policy "own runs or staff" on public.runs for select to authenticated
  using (rider_id = auth.uid() or (public.my_profile()).role = 'staff');

create policy "parcels by role" on public.parcels for select to authenticated
  using (
    case (public.my_profile()).role
      when 'staff' then true
      when 'shop' then shop_id = (public.my_profile()).shop_id
      when 'agent' then agent_id = (public.my_profile()).agent_id and status in ('on_route', 'at_agent', 'collected')
      when 'rider' then run_id in (select id from public.runs where rider_id = auth.uid())
      else false
    end
  );

create policy "events of visible parcels" on public.parcel_events for select to authenticated
  using (exists (select 1 from public.parcels p where p.id = parcel_id));

-- settings and sms_outbox have no policies: only the service role (the SMS worker) reads them.

revoke execute on all functions in schema public from public, anon;
grant execute on function public.track_parcel(text) to anon, authenticated;
grant execute on function public.my_profile(), public.book_parcel(text, text, uuid, public.parcel_size, public.fee_payer),
  public.check_in_parcel(text, boolean), public.route_board(), public.send_run(text, uuid, boolean),
  public.drop_at_agent(uuid), public.hand_over(text, boolean) to authenticated;
