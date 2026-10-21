import type { Metadata } from "next";
import { KeyValues, PageHeader, Section, Unsupported } from "@/components/admin/blocks";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="Settings" description="Fare rules, service configuration and your admin account." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Unsupported title="Fares and service rules are not configurable yet">
          <p>
            Fares are calculated in the backend (<code className="rounded bg-muted px-1">fareFor()</code> in{" "}
            <code className="rounded bg-muted px-1">backend/src/index.ts</code>) from the route distance, and the server ignores any fare the
            app sends. There is no database setting for base fare, per-km fare, minimum fare, waiting charges, service zones or ride
            availability, so this page does not offer controls that would have no effect.
          </p>
          <p className="text-foreground">Proposed migration (not applied):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code className="rounded bg-muted px-1">fare_settings</code> table with one active row: base_fare, per_km, minimum_fare,
              waiting_per_min, updated_by, updated_at. Read by admins; written only by a security definer function that also writes the
              audit log.
            </li>
            <li>Backend reads the active row (cached for a minute) in fareFor(), falling back to today&apos;s values if it is missing.</li>
            <li>A form here with validation and a confirmation step showing the old and new fare for a sample trip.</li>
          </ul>
        </Unsupported>
        <div className="space-y-6">
          <Section title="Your admin account">
            <KeyValues
              items={[
                { label: "Email", value: admin.email || "—" },
                { label: "User ID", value: <span className="font-mono text-xs">{admin.id}</span> },
                { label: "Role", value: "Administrator (public.admin_users)" },
                { label: "Password", value: <span className="text-muted-foreground">Change it in Supabase Auth or with a password reset email</span> },
              ]}
            />
          </Section>
          <Section title="Connected services" description="Configuration status only. Keys are never shown.">
            <KeyValues
              items={[
                { label: "Supabase project", value: env.supabaseUrl ? new URL(env.supabaseUrl).host : "Not set" },
                { label: "Backend API", value: env.apiUrl || "Not set" },
                { label: "Google Maps browser key", value: env.mapsKey ? "Set" : "Not set" },
                { label: "Google Map ID", value: env.mapId ? "Set" : "Not set (using Google's demo map ID)" },
              ]}
            />
          </Section>
        </div>
      </div>
    </>
  );
}
