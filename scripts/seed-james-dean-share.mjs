#!/usr/bin/env node
/**
 * Creates demo user James Dean, sample customers/activities, and shares with McKinley.
 *
 *   export SUPABASE_URL=https://....supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/seed-james-dean-share.mjs
 *
 * Recipient must have signed into CustomerCircle once (Google: mckinleycundiff@gmail.com).
 */

import { createClient } from '@supabase/supabase-js';

const JAMES_EMAIL = 'james.dean.demo+customercircle@gmail.com';
const JAMES_PASSWORD = 'JamesDeanDemo2026!';
const RECIPIENT_EMAIL = 'mckinleycundiff@gmail.com';

const url = process.env.SUPABASE_URL || 'https://igfzsivcupfcigzrmltw.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEYS;

if (!key) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role).');
  process.exit(1);
}

const admin = createClient(url, typeof key === 'string' && key.startsWith('{') ? JSON.parse(key).default : key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function findUserIdByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureJames() {
  let id = await findUserIdByEmail(JAMES_EMAIL);
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: JAMES_EMAIL,
      password: JAMES_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'James Dean', name: 'James Dean' },
    });
    if (error) throw error;
    id = data.user.id;
    console.log('Created James Dean auth user:', id);
  } else {
    console.log('James Dean already exists:', id);
  }
  await admin.from('profiles').upsert({ id, amway_id: '9900123' }, { onConflict: 'id' });
  return id;
}

async function seedCircle(ownerId) {
  const { data: existing } = await admin.from('customers').select('id').eq('user_id', ownerId);
  if (existing && existing.length > 0) {
    console.log('James already has', existing.length, 'customers — skipping seed (delete manually to re-seed).');
    return;
  }

  const rows = [
    { user_id: ownerId, name: 'Patricia Moore', phone: '555-0201', email: 'patricia@example.com', preferred: 'Text', how_met: 'Church', last_contact: isoDate(0), notes: '' },
    { user_id: ownerId, name: 'Dennis Clark', phone: '555-0202', email: '', preferred: 'Call', how_met: 'Gym', last_contact: isoDate(-18), notes: '' },
    { user_id: ownerId, name: 'Evelyn Hayes', phone: '555-0203', email: 'evelyn@example.com', preferred: 'Email', how_met: 'Neighbor', last_contact: isoDate(-3), notes: '' },
    { user_id: ownerId, name: 'Roger Blake', phone: '555-0204', email: '', preferred: 'Text', how_met: 'Work', last_contact: isoDate(-7), notes: '' },
    { user_id: ownerId, name: 'Linda Wu', phone: '555-0205', email: 'linda@example.com', preferred: 'Call', how_met: 'Family', last_contact: isoDate(-1), notes: '' },
  ];

  const { data: customers, error: cErr } = await admin.from('customers').insert(rows).select('id, name');
  if (cErr) throw cErr;

  const byName = Object.fromEntries(customers.map((c) => [c.name, c.id]));
  const activities = [
    { user_id: ownerId, customer_id: byName['Patricia Moore'], date: isoDate(0), type: 'Call', notes: 'Nutrilite follow-up' },
    { user_id: ownerId, customer_id: byName['Patricia Moore'], date: isoDate(-5), type: 'Sample', notes: 'Energy drink sample' },
    { user_id: ownerId, customer_id: byName['Dennis Clark'], date: isoDate(-18), type: 'Text', notes: 'Checking in' },
    { user_id: ownerId, customer_id: byName['Evelyn Hayes'], date: isoDate(-3), type: 'Email', notes: 'Sent catalog link' },
    { user_id: ownerId, customer_id: byName['Roger Blake'], date: isoDate(-7), type: 'Meeting', notes: 'Coffee — wellness goals' },
    { user_id: ownerId, customer_id: byName['Linda Wu'], date: isoDate(-1), type: 'Purchase', notes: 'Monthly core products' },
  ];

  const { error: aErr } = await admin.from('activities').insert(activities);
  if (aErr) throw aErr;
  console.log('Seeded', customers.length, 'customers and', activities.length, 'activities for James.');
}

async function ensureShare(ownerId, recipientId) {
  const { error } = await admin.from('shares').upsert(
    { owner_id: ownerId, recipient_id: recipientId, scope: 'all' },
    { onConflict: 'owner_id,recipient_id,scope' }
  );
  if (error) throw error;
  console.log('Shared James circle with', RECIPIENT_EMAIL);
}

async function main() {
  const recipientId = await findUserIdByEmail(RECIPIENT_EMAIL);
  if (!recipientId) {
    console.error('Recipient not found:', RECIPIENT_EMAIL, '— sign in to CustomerCircle once with Google, then re-run.');
    process.exit(1);
  }

  const jamesId = await ensureJames();
  await seedCircle(jamesId);
  await ensureShare(jamesId, recipientId);

  console.log('\nDone. Sign in as McKinley → More → Shared with me → James Dean.');
  console.log('Optional James login (demo only):', JAMES_EMAIL, '/', JAMES_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
