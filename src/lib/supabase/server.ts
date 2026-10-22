import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Runs every query as the signed-in admin, so Row Level Security still applies.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

// Public forms must not inherit an admin cookie session, or applications would
// be stored under the wrong user. This client is always anonymous until signUp.
export function createAnonClient() {
  return createJsClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Bracket access so the bundler cannot replace this with an empty string at build time.
function serviceRoleKey() {
  return (process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "").trim();
}

// Server-only. Used to create Auth users from the admin desk. Never import this
// into a Client Component and never put the key in NEXT_PUBLIC_*.
export function serviceRoleConfigured() {
  return Boolean(env.supabaseUrl && serviceRoleKey());
}

export function createServiceClient() {
  const key = serviceRoleKey();
  if (!env.supabaseUrl || !key) return null;
  return createJsClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function findAuthUserByEmail(email: string) {
  const service = createServiceClient();
  if (!service) return null;
  const cleaned = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === cleaned);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}
