import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditList } from "@/components/admin/audit-list";
import { KeyValues, PageHeader, RideStatusBadge, Section } from "@/components/admin/blocks";
import { CancelRide } from "@/components/admin/cancel-ride";
import { Notice } from "@/components/admin/notice";
import { getRide, listAudit } from "@/lib/data";
import { formatDateTime, formatKm, formatRupees, shortId, timeAgo } from "@/lib/format";
import { adminCancellableStatuses } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ride" };

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Server-rendered once per request, so reading the clock here is stable.
function minutesSince(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

export default async function RidePage({ params }: PageProps<"/rides/[id]">) {
  const { id } = await params;
  const ride = await getRide(id);
  if (ride.error) return <Notice tone="error">{ride.error}</Notice>;
  if (!ride.data) notFound();
  const r = ride.data;
  const audit = await listAudit({ from: 0, to: 19, targetType: "ride", targetId: r.id });

  const timeline = [
    { label: "Booked", at: r.created_at },
    { label: "Driver accepted", at: r.accepted_at },
    { label: "Driver at pickup", at: r.arrived_at },
    { label: "Trip started (OTP verified)", at: r.started_at },
    { label: "Completed", at: r.completed_at },
    ...(r.cancelled_at ? [{ label: "Cancelled", at: r.cancelled_at }] : []),
  ];
  const unassignedMinutes = r.status === "requested" ? minutesSince(r.created_at) : 0;

  return (
    <>
      <PageHeader
        title={`Ride ${shortId(r.id)}`}
        description={<span className="inline-flex items-center gap-2">Booked {formatDateTime(r.created_at)} <RideStatusBadge status={r.status} /></span>}
        back={{ href: "/rides", label: "Rides" }}
        actions={adminCancellableStatuses.includes(r.status) ? <CancelRide rideId={r.id} /> : null}
      />
      {r.status === "requested" && unassignedMinutes >= 10 ? (
        <Notice tone="warning" className="mb-6" title={`No driver has accepted for ${unassignedMinutes} minutes`}>
          Requests are shown to every driver who has the app open and online. Check how many approved drivers are active, or cancel the
          ride with a reason so the passenger is not left waiting.
        </Notice>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Trip">
            <KeyValues
              items={[
                { label: "Ride ID", value: <span className="font-mono text-xs">{r.id}</span> },
                {
                  label: "Pickup",
                  value: (
                    <>
                      {r.pickup}
                      {r.pickup_area ? <span className="text-muted-foreground"> · {r.pickup_area}</span> : null}
                      <a href={mapsLink(r.pickup_lat, r.pickup_lng)} target="_blank" rel="noreferrer" className="ml-2 text-xs text-primary hover:underline">Open map</a>
                    </>
                  ),
                },
                {
                  label: "Destination",
                  value: (
                    <>
                      {r.dropoff}
                      {r.drop_area ? <span className="text-muted-foreground"> · {r.drop_area}</span> : null}
                      <a href={mapsLink(r.drop_lat, r.drop_lng)} target="_blank" rel="noreferrer" className="ml-2 text-xs text-primary hover:underline">Open map</a>
                    </>
                  ),
                },
                { label: "Estimated distance", value: formatKm(r.distance_km) },
                { label: "Estimated time", value: `${r.minutes} min` },
                { label: "Quoted fare", value: `${formatRupees(r.fare)} (set by the server at booking)` },
                { label: "Final fare", value: <span className="text-muted-foreground">Not tracked — the quoted fare is not changed after booking</span> },
                { label: "Payment status", value: <span className="text-muted-foreground">No payment integration exists</span> },
                { label: "Last updated", value: `${formatDateTime(r.updated_at)} (${timeAgo(r.updated_at)})` },
              ]}
            />
          </Section>
          <Section title="Admin actions on this ride">
            {audit.error ? <Notice tone="error" className="m-4">{audit.error}</Notice> : <AuditList entries={audit.rows} />}
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Status timeline">
            <ol className="space-y-0 px-4 py-3">
              {timeline.map((step, index) => (
                <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 ? <span className="absolute top-4 left-[5px] h-full w-px bg-border" aria-hidden /> : null}
                  <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", step.at ? (step.label === "Cancelled" ? "bg-destructive" : "bg-primary") : "border bg-background")} aria-hidden />
                  <div className="text-sm">
                    <p className={cn(!step.at && "text-muted-foreground")}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.at ? formatDateTime(step.at) : "—"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Customer">
            <KeyValues
              items={[
                { label: "Name", value: <Link href={`/customers/${r.passenger_id}`} className="text-primary hover:underline">{r.passenger_name}</Link> },
                { label: "Phone", value: r.passenger_phone || "—" },
              ]}
            />
          </Section>
          <Section title="Driver">
            {r.driver_id ? (
              <KeyValues
                items={[
                  { label: "Name", value: <Link href={`/drivers/${r.driver_id}`} className="text-primary hover:underline">{r.driver_name || "Driver"}</Link> },
                  { label: "Phone", value: r.driver_phone || "—" },
                  { label: "Vehicle", value: [r.vehicle_number, r.vehicle_model].filter(Boolean).join(" · ") || "—" },
                ]}
              />
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">No driver has accepted this ride.</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
