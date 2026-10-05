-- End-to-end parcel journey with role switching. Fails loudly (ON_ERROR_STOP) on any unexpected error.
\set ON_ERROR_STOP on
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

insert into public.shops (id, name, location) values ('00000000-0000-0000-0000-0000000000a1', 'Juma Electronics', 'Mtaa wa Congo');
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'), ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005');
insert into public.profiles (id, role, full_name, shop_id) values ('00000000-0000-0000-0000-000000000001', 'shop', 'Juma', '00000000-0000-0000-0000-0000000000a1');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-000000000002', 'staff', 'Staff');
insert into public.profiles (id, role, full_name, route_id) values ('00000000-0000-0000-0000-000000000003', 'rider', 'Hamisi', 'north');
insert into public.profiles (id, role, full_name, agent_id)
  select '00000000-0000-0000-0000-000000000004', 'agent', 'Neema', id from public.agents where place = 'Mbweni Mpakani';
insert into public.profiles (id, role, full_name, agent_id)
  select '00000000-0000-0000-0000-000000000005', 'agent', 'Upendo', id from public.agents where place = 'Tegeta Nyuki';

create temp table t (k text primary key, v text);
grant all on t to authenticated;

-- shop books 15 north parcels, the first for Asha in Mbweni, customer pays at agent
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
insert into t select 'asha', (public.book_parcel('Asha Mohamed', '+255 712 345 678', (select id from public.agents where place='Mbweni Mpakani'), 'small', 'customer')).id;
select count(*) from (select public.book_parcel('Buyer ' || g, '0754' || lpad(g::text, 6, '0'), (select id from public.agents where place='Tegeta Nyuki')) from generate_series(1, 14) g) x;

do $$ begin
  perform public.book_parcel('Bad', '12345', (select id from public.agents limit 1));
  raise exception 'expected bad_phone';
exception when others then
  if sqlerrm <> 'bad_phone' then raise; end if;
end $$;

do $$ begin
  perform public.check_in_parcel('PK-000000');
  raise exception 'shop should not check in';
exception when others then
  if sqlerrm <> 'not_allowed' then raise; end if;
end $$;

select 'shop sees', count(*) from public.parcels;

-- staff checks everything in, board says north is ready, sends the run
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select count(*) as checked_in from (select public.check_in_parcel(code, true) from public.parcels where status = 'booked') x;
select * from public.route_board() where route_id = 'north';
select public.send_run('north', '00000000-0000-0000-0000-000000000003') is not null as sent;

-- rider drops at Mbweni and Tegeta
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select 'rider sees', count(*) from public.parcels;
select public.drop_at_agent((select id from public.agents where place='Mbweni Mpakani')) as dropped_mbweni;
select public.drop_at_agent((select id from public.agents where place='Tegeta Nyuki')) as dropped_tegeta;

-- Tegeta agent cannot see or hand over Asha's parcel
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
select 'tegeta agent sees', count(*) from public.parcels;

-- Mbweni agent: wrong code, fee due, then correct handover
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select 'mbweni agent sees', count(*) from public.parcels;
do $$ begin
  perform public.hand_over('abcd');
  raise exception 'expected code_not_found';
exception when others then if sqlerrm <> 'code_not_found' then raise; end if; end $$;
do $$ declare c text := (select collection_code from public.parcels limit 1); begin
  perform public.hand_over(c);
  raise exception 'expected fee_due';
exception when others then if sqlerrm <> 'fee_due' then raise; end if; end $$;
select status, fee_paid from public.hand_over((select collection_code from public.parcels limit 1), true);

-- anonymous tracking
reset role;
select tracking_token as asha_token from public.parcels where id = (select v::uuid from t where k='asha') \gset
set role anon;
select public.track_parcel(:'asha_token')->>'status' as tracked_status;
select count(*) as anon_sees_parcels from public.parcels;
reset role;

select status, count(*) from public.parcel_events where parcel_id = (select v::uuid from t where k='asha') group by status order by min(id);
select count(*) as sms_queued from public.sms_outbox;
select body from public.sms_outbox where parcel_id = (select v::uuid from t where k='asha') order by id;
