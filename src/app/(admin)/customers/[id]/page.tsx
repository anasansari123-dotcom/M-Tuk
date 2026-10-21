import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, KeyValues, PageHeader, Pagination, Section, StatCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { RideTable } from "@/components/admin/ride-table";
import { getCustomer, listRides, rideCounts, pageSize } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readPage, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const query = (await searchParams) as SearchParams;
  const customer = await getCustomer(id);
  if (customer.error) return <Notice tone="error">{customer.error}</Notice>;
  if (!customer.data) notFound();
  const c = customer.data;

  const { page, from, to } = readPage(query);
  const [rides, counts] = await Promise.all([
    listRides({ q: "", status: null, range: null, from, to, passengerId: c.id }),
    rideCounts([c.id], "passenger"),
  ]);
  const totals = counts.get(c.id);

  return (
    <>
      <PageHeader title={c.name} description={c.email} back={{ href: "/customers", label: "Customers" }} />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Rides" value={totals?.total ?? 0} />
        <StatCard label="Completed" value={totals?.completed ?? 0} tone="green" />
        <StatCard label="Cancelled" value={totals?.cancelled ?? 0} tone="red" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Profile" className="h-fit">
          <KeyValues
            items={[
              { label: "Customer ID", value: <span className="font-mono text-xs">{c.id}</span> },
              { label: "Name", value: c.name },
              { label: "Email", value: c.email },
              { label: "Phone", value: c.phone || "—" },
              { label: "Registered", value: formatDateTime(c.created_at) },
              { label: "Profile updated", value: formatDateTime(c.updated_at) },
              { label: "Account status", value: <span className="text-muted-foreground">Not tracked by the current system</span> },
            ]}
          />
        </Section>
        <Section title="Ride history" description="Newest first" className="xl:col-span-2">
          {rides.error ? <Notice tone="error" className="m-4">{rides.error}</Notice> : null}
          {rides.rows.length === 0 ? (
            <EmptyState title="No rides yet" />
          ) : (
            <div className="overflow-x-auto">
              <RideTable rides={rides.rows} hide={["customer"]} />
            </div>
          )}
          <Pagination path={`/customers/${c.id}`} params={query} page={page} total={rides.total} pageSize={pageSize} />
        </Section>
      </div>
    </>
  );
}
