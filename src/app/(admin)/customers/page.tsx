import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader, Pagination, TableCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { RangeFilter } from "@/components/admin/range-filter";
import { SearchInput } from "@/components/admin/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCustomers, rideCounts, pageSize } from "@/lib/data";
import { formatDate, formatNumber, shortId } from "@/lib/format";
import { param, readPage, readRange, readSearch, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const q = readSearch(params);
  const sort = param(params, "sort") || "newest";
  const range = param(params, "range") ? readRange(params) : null;
  const result = await listCustomers({ q, from, to, sort, range });
  const counts = await rideCounts(result.rows.map((row) => row.id), "passenger");

  return (
    <>
      <PageHeader
        title="Customers"
        description="Passengers registered in the mobile app (public.passengers). A row is created the first time a passenger signs in."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <TableCard
        toolbar={
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <SearchInput label="Search customers" placeholder="Name, email, phone or ID" />
              <FilterTabs
                path="/customers"
                params={params}
                name="sort"
                current={sort}
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "name", label: "Name A–Z" },
                ]}
              />
            </div>
            <RangeFilter current={range?.key ?? null} fromInput={range?.fromInput ?? ""} toInput={range?.toInput ?? ""} allowAll />
          </>
        }
        footer={<Pagination path="/customers" params={params} page={page} total={result.total} pageSize={pageSize} />}
      >
        {result.rows.length === 0 ? (
          <EmptyState title={q || range ? "No customers match" : "No customers yet"} body={q || range ? "Try a different search or date range." : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Rides</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="pr-4">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((customer) => {
                const c = counts.get(customer.id);
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="pl-4">
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{customer.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{shortId(customer.id)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c?.total ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c?.completed ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c?.cancelled ?? 0)}</TableCell>
                    <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">{formatDate(customer.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>
      <p className="mt-3 text-xs text-muted-foreground">
        Account status (disable/suspend) is not implemented for customers in the current system, so no account actions are offered here.
      </p>
    </>
  );
}
