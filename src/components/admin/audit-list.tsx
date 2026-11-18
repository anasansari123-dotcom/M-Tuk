import Link from "next/link";
import { formatDateTime, partnerLabel, rideStatusLabel, verificationLabel } from "@/lib/format";
import type { AuditEntry, PartnerStatus, RideStatus, VerificationStatus } from "@/lib/types";

export function describeAudit(entry: AuditEntry) {
  const d = entry.details ?? {};
  if (entry.action === "driver.status_changed") {
    const from = verificationLabel[d.from as VerificationStatus] ?? String(d.from ?? "");
    const to = verificationLabel[d.to as VerificationStatus] ?? String(d.to ?? "");
    return { title: `Driver ${from.toLowerCase()} → ${to.toLowerCase()}`, note: typeof d.note === "string" ? d.note : "" };
  }
  if (entry.action === "ride.cancelled") {
    const from = rideStatusLabel[d.from as RideStatus] ?? String(d.from ?? "");
    return { title: `Ride cancelled (was: ${from.toLowerCase()})`, note: typeof d.reason === "string" ? d.reason : "" };
  }
  if (entry.action === "partner.status_changed") {
    const from = partnerLabel[d.from as PartnerStatus] ?? String(d.from ?? "");
    const to = partnerLabel[d.to as PartnerStatus] ?? String(d.to ?? "");
    const who = typeof d.email === "string" && d.email ? ` (${d.email})` : "";
    return { title: `Partner application ${from.toLowerCase()} → ${to.toLowerCase()}${who}`, note: typeof d.note === "string" ? d.note : "" };
  }
  if (entry.action === "partner.message_sent") {
    return { title: "Message sent to applicant", note: typeof d.message === "string" ? d.message : "" };
  }
  if (entry.action === "traffic.driver_viewed") {
    const vehicle = typeof d.vehicle_number === "string" ? d.vehicle_number : "";
    return { title: `Traffic police viewed driver ${typeof d.name === "string" ? d.name : ""}${vehicle ? ` (${vehicle})` : ""}`, note: "" };
  }
  if (entry.action === "traffic.officer_granted" || entry.action === "traffic.officer_revoked") {
    const who = typeof d.email === "string" && d.email ? d.email : "an account";
    return {
      title: entry.action === "traffic.officer_granted" ? `Traffic police access given to ${who}` : `Traffic police access removed from ${who}`,
      note: [d.name, d.badge, d.station].filter((part) => typeof part === "string" && part).join(" · "),
    };
  }
  if (entry.action === "admin.granted" || entry.action === "admin.revoked") {
    const who = typeof d.email === "string" && d.email ? d.email : "an account";
    return {
      title: entry.action === "admin.granted" ? `Admin access given to ${who}` : `Admin access removed from ${who}`,
      note: typeof d.note === "string" ? d.note : "",
    };
  }
  return { title: entry.action, note: "" };
}

export function targetHref(entry: AuditEntry) {
  if (entry.target_type === "driver") return `/drivers/${entry.target_id}`;
  if (entry.target_type === "ride") return `/rides/${entry.target_id}`;
  if (entry.target_type === "partner_application") return `/partners/${entry.target_id}`;
  if (entry.target_type === "admin") return "/admins";
  return null;
}

export function AuditList({ entries, showTarget = false }: { entries: AuditEntry[]; showTarget?: boolean }) {
  if (entries.length === 0) return <p className="px-4 py-6 text-center text-sm text-muted-foreground">No admin actions recorded.</p>;
  return (
    <ol className="divide-y">
      {entries.map((entry) => {
        const { title, note } = describeAudit(entry);
        const href = showTarget ? targetHref(entry) : null;
        return (
          <li key={entry.id} className="space-y-0.5 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium">
                {href ? <Link href={href} className="hover:underline">{title}</Link> : title}
              </p>
              <time className="text-xs text-muted-foreground" dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
            </div>
            {note ? <p className="text-muted-foreground">“{note}”</p> : null}
            <p className="text-xs text-muted-foreground">by {entry.admin_email || entry.admin_id || "unknown admin"}</p>
          </li>
        );
      })}
    </ol>
  );
}
