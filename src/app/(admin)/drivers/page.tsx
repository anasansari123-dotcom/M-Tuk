import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader, Pagination, TableCard, VerificationBadge } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { SearchInput } from "@/components/admin/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { driverStatusCounts, listDrivers, rideCounts, pageSize } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { param, readEnum, readPage, readSearch, type SearchParams } from "@/lib/params";
import { verificationStatuses } from "@/lib/types";

export const metadata: Metadata = { title: "Drivers" };

export default async function DriversPage({ searchParams }: PageProps<"/drivers">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const q = readSearch(params);
  const status = readEnum(params, "status", verificationStatuses);
  const sort = param(params, "sort") || (status === "pending" ? "oldest" : "newest");
  const [result, statusCounts] = await Promise.all([listDrivers({ q, status, from, to, sort }), driverStatusCounts()]);
  const counts = await rideCounts(result.rows.map((row) => row.id), "driver");

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Service providers registered in the mobile app (public.providers). The pending queue shows the oldest request first."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <div className="mb-3">
        <FilterTabs
          path="/drivers"
          params={params}
          name="status"
          current={status}
          options={[
            { value: null, label: "All drivers", count: statusCounts.all },
            { value: "pending", label: "Pending verification", count: statusCounts.pending },
            { value: "approved", label: "Approved", count: statusCounts.approved },
            { value: "rejected", label: "Rejected", count: statusCounts.rejected },
            { value: "suspended", label: "Suspended", count: statusCounts.suspended },
          ]}
        />
      </div>
      <TableCard
        toolbar={
          <>
            <SearchInput label="Search drivers" placeholder="Name, email, phone, vehicle or ID" />
            <FilterTabs
              path="/drivers"
              params={params}
              name="sort"
              current={sort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "name", label: "Name A–Z" },
              ]}
            />
          </>
        }
        footer={<Pagination path="/drivers" params={params} page={page} total={result.total} pageSize={pageSize} />}
      >
        {result.rows.length === 0 ? (
          <EmptyState
            title={q ? "No drivers match" : status === "pending" ? "No drivers waiting for review" : "No drivers here"}
            body={q ? "Try a different search." : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Driver</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="pr-4">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((driver) => {
                const c = counts.get(driver.id);
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="pl-4">
                      <Link href={`/drivers/${driver.id}`} className="font-medium hover:underline">{driver.name}</Link>
                      <p className="text-xs text-muted-foreground">{driver.email}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{driver.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{driver.vehicle_number}</p>
                      <p className="text-xs text-muted-foreground">{driver.vehicle_model}</p>
                    </TableCell>
                    <TableCell><VerificationBadge status={driver.verification_status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c?.completed ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c?.cancelled ?? 0)}</TableCell>
                    <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">{formatDate(driver.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  );
}
