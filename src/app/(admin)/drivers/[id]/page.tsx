import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditList } from "@/components/admin/audit-list";
import { DriverActions } from "@/components/admin/driver-actions";
import { EmptyState, KeyValues, PageHeader, Pagination, Section, StatCard, VerificationBadge } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { RideTable } from "@/components/admin/ride-table";
import { getDriver, getPartnerForDriver, listAudit, listRides, rideCounts, pageSize } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readPage, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverPage({ params, searchParams }: PageProps<"/drivers/[id]">) {
  const { id } = await params;
  const query = (await searchParams) as SearchParams;
  const driver = await getDriver(id);
  if (driver.error) return <Notice tone="error">{driver.error}</Notice>;
  if (!driver.data) notFound();
  const d = driver.data;

  const { page, from, to } = readPage(query);
  const [rides, counts, audit, partner] = await Promise.all([
    listRides({ q: "", status: null, range: null, from, to, driverId: d.id }),
    rideCounts([d.id], "driver"),
    listAudit({ from: 0, to: 19, targetType: "driver", targetId: d.id }),
    getPartnerForDriver(d),
  ]);
  const application = partner.data;
  const totals = counts.get(d.id);

  return (
    <>
      <PageHeader
        title={d.name}
        description={<span className="inline-flex items-center gap-2">{d.vehicle_number} · {d.vehicle_model} <VerificationBadge status={d.verification_status} /></span>}
        back={{ href: "/drivers", label: "Drivers" }}
        actions={<DriverActions driverId={d.id} status={d.verification_status} />}
      />
      {d.verification_status === "pending" ? (
        <Notice tone="warning" className="mb-6" title="Waiting for verification">
          {application
            ? "Documents from the website application are linked below. Approve only after you have checked them. Until then this driver cannot pick up rides in the app."
            : "No website application is linked yet. Ask the driver to submit documents on Become a partner, or check papers offline before approving. Until approved they cannot pick up rides in the app."}
        </Notice>
      ) : null}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Rides accepted" value={totals?.total ?? 0} />
        <StatCard label="Completed" value={totals?.completed ?? 0} tone="green" />
        <StatCard label="Cancelled" value={totals?.cancelled ?? 0} tone="red" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Section title="Profile">
            <KeyValues
              items={[
                { label: "Driver ID", value: <span className="font-mono text-xs">{d.id}</span> },
                { label: "Email", value: d.email },
                { label: "Phone", value: d.phone || "—" },
                { label: "Vehicle number", value: <span className="font-mono">{d.vehicle_number}</span> },
                { label: "Vehicle model", value: d.vehicle_model },
                { label: "Registered", value: formatDateTime(d.created_at) },
                { label: "Verification", value: <VerificationBadge status={d.verification_status} /> },
                { label: "Last decision", value: d.verification_updated_at ? formatDateTime(d.verification_updated_at) : "Never reviewed" },
                ...(d.verification_note ? [{ label: "Reason / note", value: d.verification_note }] : []),
                {
                  label: "Documents",
                  value: application ? (
                    <Link href={`/partners/${application.id}`} className="text-primary hover:underline">
                      Open partner application
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No website application linked</span>
                  ),
                },
                { label: "Live location", value: <span className="text-muted-foreground">Not stored by the current system</span> },
                { label: "Rating", value: <span className="text-muted-foreground">Ratings are not implemented</span> },
              ]}
            />
          </Section>
          <Section title="Verification history">
            {audit.error ? <Notice tone="error" className="m-4">{audit.error}</Notice> : <AuditList entries={audit.rows} />}
          </Section>
        </div>
        <Section title="Ride history" description="Rides this driver accepted, newest first" className="xl:col-span-2 h-fit">
          {rides.error ? <Notice tone="error" className="m-4">{rides.error}</Notice> : null}
          {rides.rows.length === 0 ? (
            <EmptyState title="No rides yet" />
          ) : (
            <div className="overflow-x-auto">
              <RideTable rides={rides.rows} hide={["driver"]} />
            </div>
          )}
          <Pagination path={`/drivers/${d.id}`} params={query} page={page} total={rides.total} pageSize={pageSize} />
        </Section>
      </div>
    </>
  );
}
