import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [{ count: pendingDrivers, error: driversError }, { count: pendingPartners, error: partnersError }] = await Promise.all([
    supabase.from("providers").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <AdminShell
      email={admin.email}
      pendingDrivers={driversError ? null : pendingDrivers}
      pendingPartners={partnersError ? null : pendingPartners}
    >
      {children}
    </AdminShell>
  );
}
