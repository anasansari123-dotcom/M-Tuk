import "server-only";

type DbError = { code?: string; message?: string } | null | undefined;

// Turns Supabase/PostgREST errors into messages that are safe to show an admin.
// Our SQL functions raise plain-language messages with these codes, so those pass through.
export function describeError(error: DbError, fallback = "Something went wrong. Try again.") {
  if (!error) return fallback;
  const code = error.code ?? "";
  if (["22023", "55000", "P0002", "42501", "23505"].includes(code) && error.message) return error.message;
  if (code === "PGRST202" || code === "42883" || code === "PGRST205" || code === "42P01" || code === "42703") {
    return "The admin database setup is incomplete. Run supabase/admin.sql, then supabase/public.sql and supabase/accounts.sql in Supabase.";
  }
  console.error("Supabase error", code, error.message);
  return fallback;
}
