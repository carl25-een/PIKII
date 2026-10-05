-- Starting data for the pilot. Agent points below are examples: replace them with the real agents you sign up.

insert into public.settings (key, value) values
  ('min_parcels_per_run', '15'),
  ('tracking_base_url', 'https://CHANGE-ME.example/t/');

insert into public.zone_fees (zone, fee_tzs) values
  ('near', 2500),
  ('middle', 4000),
  ('far', 5000);

insert into public.routes (id, name, sort) values
  ('north', 'North coast (Bagamoyo Road)', 1),
  ('morogoro', 'Morogoro Road', 2),
  ('south', 'Airport / south', 3),
  ('peninsula', 'Peninsula', 4);

insert into public.agents (route_id, place, host, zone, stop_order) values
  ('north', 'Mbezi Beach', 'Example: Rehema Stationery', 'middle', 1),
  ('north', 'Tegeta Nyuki', 'Example: Upendo Pharmacy', 'far', 2),
  ('north', 'Bunju B', 'Example: Baraka mobile money', 'far', 3),
  ('north', 'Mbweni Mpakani', 'Example: Duka la Mama Neema', 'far', 4),
  ('morogoro', 'Ubungo Riverside', 'Example: Faraja Pharmacy', 'middle', 1),
  ('morogoro', 'Kimara Korogwe', 'Example: Duka la Saidi', 'far', 2),
  ('south', 'Tabata Segerea', 'Example: Kisima Agent', 'middle', 1),
  ('south', 'Mbagala Rangi Tatu', 'Example: Mama Zuhura', 'far', 2),
  ('peninsula', 'Upanga', 'Example: Salama Duka', 'near', 1),
  ('peninsula', 'Msasani', 'Example: Bahari Stationery', 'near', 2);
