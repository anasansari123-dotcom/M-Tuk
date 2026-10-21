import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string };

// Data access layer: every admin page and action calls this first. It verifies the JWT
// and checks public.admin_users through is_admin(). A signed-in passenger or driver
// gets signed out and sent back to /login.
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError) {
    // is_admin() is missing until supabase/admin.sql has been run.
    redirect("/login?error=setup");
  }
  if (isAdmin !== true) redirect("/login?error=forbidden");

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

// For Server Actions and Route Handlers, which must not redirect mid-mutation.
export async function checkAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}
