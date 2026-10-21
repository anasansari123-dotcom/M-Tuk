import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = (process.env.ADMIN_EMAIL?.trim() || 'admin@mtuknagarride.com').toLowerCase();
const generatedPassword = `${randomBytes(18).toString('base64url')}Aa1!`;
const password = process.env.ADMIN_PASSWORD?.trim() || generatedPassword;

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('ADMIN_EMAIL must be a valid email address.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD must contain at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail() {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Could not safely search all Auth users.');
}

async function main() {
  const { error: tableError } = await supabase.from('admin_users').select('user_id').limit(1);
  if (tableError) {
    throw new Error('Admin database setup is missing. Run backend/sql/admin.sql first.');
  }

  let user = await findUserByEmail();
  let created = false;
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, role: 'admin' },
    });
    if (error || !data.user) throw error ?? new Error('Could not update the admin Auth user.');
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });
    if (error || !data.user) throw error ?? new Error('Could not create the admin Auth user.');
    user = data.user;
    created = true;
  }

  const { error: roleError } = await supabase
    .from('admin_users')
    .upsert({ user_id: user.id, note: 'Primary administrator' }, { onConflict: 'user_id' });
  if (roleError) {
    if (created) await supabase.auth.admin.deleteUser(user.id);
    throw roleError;
  }

  console.log('Admin account is ready.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Remove ADMIN_PASSWORD and SUPABASE_SERVICE_ROLE_KEY from the environment after saving the password.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not create the admin account.');
  process.exit(1);
});
