// Creates a Pikii account (shop owner, staff, rider or agent) that signs in with phone number + PIN.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-user.mjs \
//     --role shop --name "Juma" --phone 0712345678 --pin 482913 --shop "Juma Electronics" --location "Mtaa wa Congo"
//
//   --role rider --route north
//   --role agent --agent-place "Mbweni Mpakani"
//   --role staff
//
// The service role key is secret: run this only on a trusted computer, never inside the app.
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';

const { values: a } = parseArgs({
  options: {
    role: { type: 'string' },
    name: { type: 'string' },
    phone: { type: 'string' },
    pin: { type: 'string' },
    shop: { type: 'string' },
    location: { type: 'string' },
    route: { type: 'string' },
    'agent-place': { type: 'string' },
  },
});

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const digits = (a.phone ?? '').replace(/\D/g, '');
const phone = /^0[67]\d{8}$/.test(digits) ? '255' + digits.slice(1) : /^255[67]\d{8}$/.test(digits) ? digits : null;
if (!['shop', 'staff', 'rider', 'agent'].includes(a.role)) fail('--role must be shop, staff, rider or agent');
if (!a.name) fail('--name is required');
if (!phone) fail('--phone must be a Tanzanian mobile number like 0712345678');
if (!a.pin || a.pin.length < 6) fail('--pin must be at least 6 digits');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const profile = { role: a.role, full_name: a.name, phone };
if (a.role === 'shop') {
  if (!a.shop || !a.location) fail('--shop and --location are required for a shop account');
  const { data, error } = await db.from('shops').insert({ name: a.shop, location: a.location, phone }).select('id').single();
  if (error) fail(error.message);
  profile.shop_id = data.id;
}
if (a.role === 'rider') {
  if (!a.route) fail('--route is required for a rider (north, morogoro, south or peninsula)');
  profile.route_id = a.route;
}
if (a.role === 'agent') {
  const { data, error } = await db.from('agents').select('id').eq('place', a['agent-place'] ?? '').maybeSingle();
  if (error || !data) fail(`No agent point called "${a['agent-place']}". Add it to the agents table first.`);
  profile.agent_id = data.id;
}

const { data: created, error: authError } = await db.auth.admin.createUser({
  email: `${phone}@users.pikii.app`,
  password: a.pin,
  email_confirm: true,
  user_metadata: { phone, name: a.name },
});
if (authError) fail(authError.message);

const { error: profileError } = await db.from('profiles').insert({ id: created.user.id, ...profile });
if (profileError) {
  await db.auth.admin.deleteUser(created.user.id);
  fail(profileError.message);
}
console.log(`Created ${a.role} account for ${a.name} (${a.phone}).`);
