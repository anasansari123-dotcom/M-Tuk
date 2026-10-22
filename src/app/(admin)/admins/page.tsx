import type { Metadata } from "next";
import { EmptyState, PageHeader, Section } from "@/components/admin/blocks";
import { CreateAdminForm } from "@/components/admin/create-admin-form";
import { Notice } from "@/components/admin/notice";
import { RevokeAdminButton } from "@/components/admin/revoke-admin-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdmins } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { serviceRoleConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const me = await requireAdmin();
  const result = await listAdmins();
  const canCreate = serviceRoleConfigured();

  return (
    <>
      <PageHeader
        title="Administrators"
        description="People who can open this desk, verify partners and cancel rides. They sign in at /login."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      {!canCreate ? (
        <Notice tone="warning" className="mb-4" title="Creating logins needs a server key">
          Local: add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="rounded bg-muted px-1">.env.local</code> and restart <code className="rounded bg-muted px-1">npm run dev</code>.
          Vercel: same key in Environment Variables (not NEXT_PUBLIC_), then Redeploy. Copy it from Supabase → Project Settings → API →{" "}
          <code className="rounded bg-muted px-1">service_role</code>.
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Create admin" description="They get a confirmed Auth login and a row in admin_users." className="xl:col-span-1 h-fit">
          <CreateAdminForm />
        </Section>
        <Section title="Who has access" className="xl:col-span-2">
          {result.data.length === 0 ? (
            <EmptyState title="No admins listed" body="Run supabase/accounts.sql, then reload." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Email</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{row.email || "—"}</p>
                      {row.user_id === me.id ? <p className="text-xs text-muted-foreground">You</p> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="pr-4">
                      {row.user_id === me.id ? <span className="text-xs text-muted-foreground">Current session</span> : <RevokeAdminButton userId={row.user_id} />}
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
