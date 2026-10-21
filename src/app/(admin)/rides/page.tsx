import type { Metadata } from "next";
import { EmptyState, FilterTabs, PageHeader, Pagination, TableCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { RangeFilter } from "@/components/admin/range-filter";
import { RideTable } from "@/components/admin/ride-table";
import { SearchInput } from "@/components/admin/search-input";
import { listRides, pageSize } from "@/lib/data";
import { rideStatusLabel } from "@/lib/format";
import { param, readEnum, readPage, readRange, readSearch, type SearchParams } from "@/lib/params";
import { rideStatuses } from "@/lib/types";

export const metadata: Metadata = { title: "Rides" };

export default async function RidesPage({ searchParams }: PageProps<"/rides">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const q = readSearch(params);
  const status = readEnum(params, "status", rideStatuses);
  const range = param(params, "range") ? readRange(params) : null;
  const result = await listRides({ q, status, range, from, to });

  return (
    <>
      <PageHeader
        title="Rides"
        description="Every booking from the mobile app (public.rides), newest first. Statuses are the ones the app actually uses."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <div className="mb-3">
        <FilterTabs
          path="/rides"
          params={params}
          name="status"
          current={status}
          options={[{ value: null, label: "All" }, ...rideStatuses.map((value) => ({ value, label: rideStatusLabel[value] }))]}
        />
      </div>
      <TableCard
        toolbar={
          <>
            <SearchInput label="Search rides" placeholder="Ride/user ID, name, place or vehicle" />
            <RangeFilter current={range?.key ?? null} fromInput={range?.fromInput ?? ""} toInput={range?.toInput ?? ""} allowAll />
          </>
        }
        footer={<Pagination path="/rides" params={params} page={page} total={result.total} pageSize={pageSize} />}
      >
        {result.rows.length === 0 ? (
          <EmptyState
            title={q || status || range ? "No rides match these filters" : "No rides yet"}
            body={q || status || range ? "Clear a filter or widen the date range." : undefined}
          />
        ) : (
          <RideTable rides={result.rows} />
        )}
      </TableCard>
      <p className="mt-3 text-xs text-muted-foreground">
        Fares are the server-side quote saved at booking. The system has no separate final fare, payment status or cancellation reason
        for passenger cancellations.
      </p>
    </>
  );
}
