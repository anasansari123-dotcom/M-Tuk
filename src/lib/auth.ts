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

export type TrafficViewer = { id: string; email: string; isAdmin: boolean; officerName: string; station: string };

// Traffic map access: admins and accounts listed in public.traffic_officers.
// Officers are read-only and never reach the admin desk.
export const requireTrafficViewer = cache(async (): Promise<TrafficViewer> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login?next=/traffic");

  const [{ data: isAdmin }, { data: canView, error: roleError }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("can_view_traffic"),
  ]);
  if (roleError) redirect("/login?error=setup");
  if (canView !== true) redirect("/login?error=forbidden");

  let officerName = "";
  let station = "";
  if (isAdmin !== true) {
    const { data: officer } = await supabase
      .from("traffic_officers")
      .select("name, station")
      .eq("user_id", claims.sub)
      .maybeSingle();
    officerName = officer?.name ?? "";
    station = officer?.station ?? "";
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    isAdmin: isAdmin === true,
    officerName,
    station,
  };
});
