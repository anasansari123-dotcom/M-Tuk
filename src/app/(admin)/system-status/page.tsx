import type { Metadata } from "next";
import { KeyValues, PageHeader, Section } from "@/components/admin/blocks";
import { HealthPill } from "@/components/admin/health";
import { Notice } from "@/components/admin/notice";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { serviceRoleConfigured } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "System status" };

// Checks run when the page loads. Nothing here reads or shows a secret.
async function checkDatabase() {
  const supabase = await createClient();
  const started = performance.now();
  const checks = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("passengers").select("id", { count: "exact", head: true }),
    supabase.from("providers").select("verification_status", { count: "exact", head: true }),
    supabase.from("rides").select("id", { count: "exact", head: true }),
    supabase.from("admin_audit_log").select("id", { count: "exact", head: true }),
    supabase.rpc("admin_overview", { p_from: new Date().toISOString(), p_to: new Date().toISOString() }),
    supabase.rpc("admin_list_admins"),
  ]);
  const ms = Math.round(performance.now() - started);
  const names = ["Admin role function", "passengers table", "providers verification columns", "rides table", "Audit log table", "Reporting functions", "Admin accounts functions"];
  return { ms, at: new Date().toISOString(), results: checks.map((check, index) => ({ name: names[index], ok: !check.error, code: check.error?.code ?? "" })) };
}

export default async function SystemStatusPage() {
  const db = await checkDatabase();
  const allOk = db.results.every((result) => result.ok);
  const serviceRole = serviceRoleConfigured();

  return (
    <>
      <PageHeader title="System status" description={`Checked ${formatDateTime(db.at)}. Reload the page to check again.`} />
      {allOk ? null : (
        <Notice tone="warning" className="mb-6" title="Some database checks failed">
          If several fail, run supabase/admin.sql in the Supabase SQL editor. Error codes are listed below.
        </Notice>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Section title="Backend API" description={`${env.apiUrl || "Not configured"} · GET /health`}>
            <HealthPill />
            <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              The backend&apos;s /health route only reports that the process is up. It does not check Supabase or Google APIs.
            </p>
          </Section>
          <Section title="Environment" description="Shows whether each value is set, never the value itself">
            <KeyValues
              items={[
                { label: "NEXT_PUBLIC_SUPABASE_URL", value: env.supabaseUrl ? "Set" : "Missing" },
                { label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: env.supabaseKey ? "Set" : "Missing" },
                { label: "NEXT_PUBLIC_API_URL", value: env.apiUrl ? "Set" : "Missing" },
                { label: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", value: env.mapsKey ? "Set" : "Missing (live map disabled)" },
                { label: "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", value: env.mapId ? "Set" : "Missing (demo map ID)" },
                { label: "SUPABASE_SERVICE_ROLE_KEY", value: serviceRole ? "Set (server only — create admin/provider logins)" : "Missing (cannot create logins from the desk)" },
              ]}
            />
          </Section>
        </div>
        <Section title="Supabase" description={`${db.ms} ms for all checks, run as your admin account`}>
          <ul className="divide-y">
            {db.results.map((result) => (
              <li key={result.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className={result.ok ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-destructive"} aria-hidden />
                  {result.name}
                </span>
                <span className={result.ok ? "text-muted-foreground" : "font-mono text-xs text-destructive"}>{result.ok ? "OK" : result.code || "Failed"}</span>
              </li>
            ))}
          </ul>
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            No application error log exists yet; backend errors go to the Render service logs.
          </p>
        </Section>
      </div>
    </>
  );
}
