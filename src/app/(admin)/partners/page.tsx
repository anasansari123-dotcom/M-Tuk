import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader, Pagination, PartnerBadge, TableCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { SearchInput } from "@/components/admin/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPartners, partnerStatusCounts, pageSize } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { param, readPage, readSearch, type SearchParams } from "@/lib/params";
import { partnerStatuses, type PartnerStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersPage({ searchParams }: PageProps<"/partners">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const q = readSearch(params);
  const rawStatus = param(params, "status") || "pending";
  const status: PartnerStatus | null =
    rawStatus === "all" ? null : partnerStatuses.includes(rawStatus as PartnerStatus) ? (rawStatus as PartnerStatus) : "pending";
  const [result, statusCounts] = await Promise.all([listPartners({ q, status, from, to }), partnerStatusCounts()]);

  return (
    <>
      <PageHeader
        title="Partner applications"
        description="KYC submitted on the public website. Approve these before the service provider can pick up rides in the app."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <div className="mb-3">
        <FilterTabs
          path="/partners"
          params={params}
          name="status"
          current={rawStatus === "all" ? "all" : status}
          options={[
            { value: "pending", label: "Pending review", count: statusCounts.pending },
            { value: "approved", label: "Approved", count: statusCounts.approved },
            { value: "rejected", label: "Rejected", count: statusCounts.rejected },
            { value: "all", label: "All", count: statusCounts.all },
          ]}
        />
      </div>
      <TableCard
        toolbar={<SearchInput label="Search applications" placeholder="Name, email, phone, vehicle or city" />}
        footer={<Pagination path="/partners" params={params} page={page} total={result.total} pageSize={pageSize} />}
      >
        {result.rows.length === 0 ? (
          <EmptyState
            title={q ? "No applications match" : status === "pending" ? "No partner applications waiting" : "No applications here"}
            body={q ? "Try a different search." : "Applications from the Become a partner page appear here."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Applicant</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-4">
                    <Link href={`/partners/${row.id}`} className="font-medium hover:underline">{row.name}</Link>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.phone || "—"}</TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">{row.vehicle_number}</p>
                    <p className="text-xs text-muted-foreground">{row.vehicle_model}</p>
                  </TableCell>
                  <TableCell>{row.city || "—"}</TableCell>
                  <TableCell><PartnerBadge status={row.status} /></TableCell>
                  <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  );
}
