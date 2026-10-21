import type { Metadata } from "next";
import { Download } from "lucide-react";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/admin/blocks";
import { HorizontalBars, RideTrendChart, SignupTrendChart } from "@/components/admin/charts";
import { Notice } from "@/components/admin/notice";
import { PrintButton } from "@/components/admin/print-button";
import { RangeFilter } from "@/components/admin/range-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCancellationBreakdown, getOverview, getRideTrend, getSignupTrend } from "@/lib/data";
import { formatDate, formatKm, formatNumber, formatRupees } from "@/lib/format";
import { readRange, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Reports" };

const stageLabel: Record<string, string> = {
  before_driver_assigned: "Before a driver accepted",
  driver_on_the_way: "Driver on the way",
  driver_at_pickup: "Driver at pickup",
};

function pct(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = (await searchParams) as SearchParams;
  const range = readRange(params, "30d");
  const [overview, rides, signups, cancellations] = await Promise.all([
    getOverview(range),
    getRideTrend(range),
    getSignupTrend(range),
    getCancellationBreakdown(range),
  ]);
  const o = overview.data;
  const error = overview.error ?? rides.error ?? signups.error ?? cancellations.error;
  const exportQuery = `range=custom&from=${range.fromInput}&to=${range.toInput}`;
  const exportLink = "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted";

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${range.label} · ${formatDate(range.from.toISOString())} – ${range.toInput} (India time). Aggregated in the database.`}
        actions={
          <>
            <RangeFilter current={range.key} fromInput={range.fromInput} toInput={range.toInput} />
            <PrintButton />
          </>
        }
      />
      {error ? <Notice tone="error" className="mb-6">{error}</Notice> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Rides booked" value={o?.range.total} />
        <StatCard label="Completion rate" value={o ? pct(o.range.completed, o.range.total) : null} hint={o ? `${formatNumber(o.range.completed)} completed` : undefined} />
        <StatCard label="Cancellation rate" value={o ? pct(o.range.cancelled, o.range.total) : null} hint={o ? `${formatNumber(o.range.cancelled)} cancelled` : undefined} />
        <StatCard label="Distance, completed rides" value={o ? formatKm(o.range.completed_distance_km) : null} />
        <StatCard label="Quoted fares, completed rides" value={o ? formatRupees(o.range.completed_quoted_fare) : null} hint="Gross quoted fare. Not collected revenue." />
        <StatCard label="New customers" value={o?.customers_new} />
        <StatCard label="New drivers" value={o?.drivers_new} />
        <StatCard label="Drivers pending review" value={o?.drivers_pending} hint="Current, all time" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Section title="Ride statistics" description={`Per ${range.bucket}, by booking time`}>
          <div className="p-4">
            {rides.data.some((p) => p.total > 0) ? <RideTrendChart data={rides.data} bucket={range.bucket} /> : <EmptyState title="No rides in this period" />}
          </div>
        </Section>
        <Section title="Customer and driver growth" description={`New registrations per ${range.bucket}`}>
          <div className="p-4">
            {signups.data.some((p) => p.customers + p.drivers > 0) ? (
              <SignupTrendChart data={signups.data} bucket={range.bucket} />
            ) : (
              <EmptyState title="No registrations in this period" />
            )}
          </div>
        </Section>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Section title="When rides were cancelled" description="Inferred from ride timestamps" className="xl:col-span-2">
          <div className="p-4">
            {cancellations.data.length === 0 ? (
              <EmptyState title="No cancellations in this period" />
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <HorizontalBars data={cancellations.data.map((row) => ({ label: stageLabel[row.stage] ?? row.stage, value: row.rides }))} />
                <ul className="space-y-2 text-sm">
                  {cancellations.data.map((row) => (
                    <li key={row.stage} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{stageLabel[row.stage] ?? row.stage}</span>
                      <span className="tabular-nums">{formatNumber(row.rides)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              The app does not record who cancelled or why, except for admin cancellations (see the audit log).
            </p>
          </div>
        </Section>
        <Section title="Driver verification" description="Current status of all drivers">
          <ul className="divide-y text-sm">
            {[
              ["Pending", o?.drivers_pending],
              ["Approved", o?.drivers_approved],
              ["Rejected", o?.drivers_rejected],
              ["Suspended", o?.drivers_suspended],
            ].map(([label, value]) => (
              <li key={String(label)} className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums">{formatNumber(value as number | undefined)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title="Table view"
        description="The numbers behind the charts"
        className="mb-6"
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <a className={exportLink} href={`/api/export/rides?${exportQuery}`}><Download className="size-3.5" aria-hidden /> Rides CSV</a>
            <a className={exportLink} href={`/api/export/customers?${exportQuery}`}><Download className="size-3.5" aria-hidden /> Customers CSV</a>
            <a className={exportLink} href={`/api/export/drivers?${exportQuery}`}><Download className="size-3.5" aria-hidden /> Drivers CSV</a>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{range.bucket === "day" ? "Day" : range.bucket === "week" ? "Week of" : "Month"}</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="text-right">New customers</TableHead>
                <TableHead className="pr-4 text-right">New drivers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rides.data.map((point, index) => (
                <TableRow key={point.bucket}>
                  <TableCell className="pl-4 whitespace-nowrap">{formatDate(`${point.bucket}T12:00:00+05:30`)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(point.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(point.completed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(point.cancelled)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(signups.data[index]?.customers ?? 0)}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatNumber(signups.data[index]?.drivers ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
      <p className="text-xs text-muted-foreground">
        CSV exports cover the selected range and stop at 10,000 rows per file. Ride exports never include trip OTPs. Payment reports
        are unavailable because the platform has no payment records.
      </p>
    </>
  );
}
