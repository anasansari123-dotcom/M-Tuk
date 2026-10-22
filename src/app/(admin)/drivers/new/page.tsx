import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/admin/blocks";
import { CreateProviderForm } from "@/components/admin/create-provider-form";
import { Notice } from "@/components/admin/notice";
import { serviceRoleConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add service provider" };

export default function NewDriverPage() {
  const canCreate = serviceRoleConfigured();

  return (
    <>
      <PageHeader
        title="Add service provider"
        description="Creates an app login and a providers row. After verification they sign in to the MTUK Nagar Ride app and pick up rides."
        back={{ href: "/drivers", label: "Drivers" }}
      />
      {!canCreate ? (
        <Notice tone="warning" className="mb-6" title="Creating logins needs a server key">
          Local: add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="rounded bg-muted px-1">.env.local</code> and restart the dev server. Vercel: same key, then Redeploy.
        </Notice>
      ) : (
        <Notice tone="info" className="mb-6">
          If you do not tick Verify now, they stay pending and cannot pick up rides until you approve them on the driver page.
        </Notice>
      )}
      <Section title="Provider details">
        <div className="p-4">
          <CreateProviderForm />
        </div>
      </Section>
    </>
  );
}
