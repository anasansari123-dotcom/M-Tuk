import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Car, CheckCircle2, Clock, Navigation, Route, UserCheck, Users } from "lucide-react";
import { EmptyState, PageHeader, Section, StatCard, VerificationBadge } from "@/components/admin/blocks";
import { RideTrendChart } from "@/components/admin/charts";
import { HealthPill } from "@/components/admin/health";
import { Notice } from "@/components/admin/notice";
import { RangeFilter } from "@/components/admin/range-filter";
import { RideTable } from "@/components/admin/ride-table";
import { getOverview, getRideTrend, listAudit, listRides, recentCustomers, recentDrivers } from "@/lib/data";
import { formatKm, formatRupees, timeAgo, verificationLabel } from "@/lib/format";
import { readRange, type SearchParams } from "@/lib/params";
import type { VerificationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = (await searchParams) as SearchParams;
  const range = readRange(params, "7d");
  const [overview, trend, rides, customers, drivers, approvals] = await Promise.all([
    getOverview(range),
    getRideTrend(range),
    listRides({ q: "", status: null, range: null, from: 0, to: 7 }),
    recentCustomers(),
    recentDrivers(),
    listAudit({ from: 0, to: 5, action: "driver.status_changed" }),
  ]);
  const o = overview.data;
  const errors = [overview.error, trend.error, rides.error, customers.error, drivers.error, approvals.error].filter(Boolean);
  const live = o ? o.live_requested + o.live_accepted + o.live_arriving + o.live_ongoing : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Live counts are right now. Everything else covers ${range.label.toLowerCase()} (India time).`}
        actions={<RangeFilter current={range.key} fromInput={range.fromInput} toInput={range.toInput} />}
      />
      {errors.length > 0 ? (
        <Notice tone="error" className="mb-6">
          {errors[0]}
        </Notice>
      ) : null}

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Happening now</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Searching for driver" value={o?.live_requested} icon={Clock} tone="amber" href="/rides?status=requested" />
        <StatCard label="Driver assigned" value={o ? o.live_accepted + o.live_arriving : null} hint={o ? `${o.live_arriving} at pickup` : undefined} icon={Navigation} tone="blue" href="/rides?status=accepted" />
        <StatCard label="In progress" value={o?.live_ongoing} icon={Route} tone="green" href="/rides?status=ongoing" />
        <StatCard label="Pending verification" value={o?.drivers_pending} hint="Website applications are under Partners" icon={UserCheck} tone="amber" href="/partners?status=pending" />
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{range.label}</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Rides booked" value={o?.range.total} hint={o ? `${o.rides_all_time.toLocaleString("en-IN")} all time` : undefined} icon={Route} />
        <StatCard label="Completed" value={o?.range.completed} hint={o?.range.total ? `${Math.round((o.range.completed / o.range.total) * 100)}% of booked` : undefined} icon={CheckCircle2} tone="green" />
        <StatCard label="Cancelled" value={o?.range.cancelled} hint={o?.range.total ? `${Math.round((o.range.cancelled / o.range.total) * 100)}% of booked` : undefined} icon={Ban} tone="red" />
        <StatCard
          label="Quoted fares, completed rides"
          value={o ? formatRupees(o.range.completed_quoted_fare) : null}
          hint="Fare quoted at booking. Not collected payments — no payment data exists."
        />
        <StatCard label="New customers" value={o?.customers_new} hint={o ? `${o.customers_total.toLocaleString("en-IN")} total` : undefined} icon={Users} href="/customers" />
        <StatCard label="New drivers" value={o?.drivers_new} hint={o ? `${o.drivers_total.toLocaleString("en-IN")} total` : undefined} icon={Car} href="/drivers" />
        <StatCard label="Drivers approved" value={o?.drivers_approved} hint={o ? `${o.drivers_rejected} rejected · ${o.drivers_suspended} suspended (all time)` : undefined} icon={UserCheck} tone="green" href="/drivers?status=approved" />
        <StatCard label="Avg. completed trip" value={o ? formatKm(o.range.avg_distance_km) : null} hint={o ? `Avg. quoted fare ${formatRupees(o.range.avg_quoted_fare)}` : undefined} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Section title="Ride trend" description={`Per ${range.bucket}, by booking time`} className="xl:col-span-2">
          <div className="p-4">
            {trend.data.some((point) => point.total > 0) ? (
              <RideTrendChart data={trend.data} bucket={range.bucket} />
            ) : (
              <EmptyState title="No rides in this period" body="Choose a longer date range to see the trend." />
            )}
          </div>
        </Section>
        <div className="space-y-6">
          <Section title="System status" actions={<Link href="/system-status" className="text-xs text-primary hover:underline">Details</Link>}>
            <HealthPill />
          </Section>
          <Section title="Driver approval activity" actions={<Link href="/audit-logs" className="text-xs text-primary hover:underline">Audit log</Link>}>
            {approvals.rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No driver decisions yet.</p>
            ) : (
              <ul className="divide-y">
                {approvals.rows.map((entry) => {
                  const to = String(entry.details.to ?? "") as VerificationStatus;
                  return (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/drivers/${entry.target_id}`} className="font-medium hover:underline">
                          {verificationLabel[to] ?? to} driver
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">by {entry.admin_email || "admin"}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <Section title="Recent bookings" actions={<Link href="/rides" className="text-xs text-primary hover:underline">All rides</Link>} className="mb-6">
        {rides.rows.length === 0 ? <EmptyState title="No rides yet" /> : <div className="overflow-x-auto"><RideTable rides={rides.rows} /></div>}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recent customer registrations" actions={<Link href="/customers" className="text-xs text-primary hover:underline">All customers</Link>}>
          {customers.data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <ul className="divide-y">
              {customers.data.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link>
                    <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(customer.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Recent driver registrations" actions={<Link href="/drivers" className="text-xs text-primary hover:underline">All drivers</Link>}>
          {drivers.data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No drivers yet.</p>
          ) : (
            <ul className="divide-y">
              {drivers.data.map((driver) => (
                <li key={driver.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/drivers/${driver.id}`} className="font-medium hover:underline">{driver.name}</Link>
                    <p className="truncate text-xs text-muted-foreground">{driver.vehicle_number} · {timeAgo(driver.created_at)}</p>
                  </div>
                  <VerificationBadge status={driver.verification_status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      {live !== null && live === 0 && o?.rides_all_time === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No ride has been booked on the platform yet.</p>
      ) : null}
    </>
  );
}
