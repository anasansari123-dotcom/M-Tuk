import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Section } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { CreateTrafficOfficerForm, RevokeTrafficOfficerButton } from "@/components/admin/traffic-officer-forms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTrafficOfficers } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { serviceRoleConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Traffic police" };

export default async function TrafficOfficersPage() {
  const result = await listTrafficOfficers();
  const canCreate = serviceRoleConfigured();

  return (
    <>
      <PageHeader
        title="Traffic police"
        description="Read-only logins for traffic police. They sign in at /login and see only the live e-rickshaw map with driver photo, vehicle and licence details."
        actions={
          <Link href="/traffic" className="text-sm font-medium text-primary hover:underline">
            Open traffic map
          </Link>
        }
      />
      {result.error ? (
        <Notice tone="error" className="mb-4">
          {result.error.includes("admin_list_traffic_officers") ? "Run supabase/traffic.sql in Supabase, then reload." : result.error}
        </Notice>
      ) : null}
      {!canCreate ? (
        <Notice tone="warning" className="mb-4" title="Creating logins needs a server key">
          Add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> to the server environment, then redeploy.
        </Notice>
      ) : null}
      <Notice tone="info" className="mb-6" title="What officers can and cannot see">
        They see online e-rickshaws, driver name, photo, mobile, vehicle and licence number. They cannot see Aadhaar, PAN, documents,
        passengers, payments or this desk. Every driver they open is recorded in the audit log.
      </Notice>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Add traffic officer" className="h-fit xl:col-span-1">
          <CreateTrafficOfficerForm />
        </Section>
        <Section title="Officers with access" className="xl:col-span-2">
          {result.data.length === 0 ? (
            <EmptyState title="No traffic police logins yet" body="Create one with the form." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Officer</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{row.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.badge_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.station || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <RevokeTrafficOfficerButton userId={row.user_id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>
    </>
  );
}
