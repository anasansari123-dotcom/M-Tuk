import Link from "next/link";
import { formatDateTime, rideStatusLabel, verificationLabel } from "@/lib/format";
import type { AuditEntry, RideStatus, VerificationStatus } from "@/lib/types";

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
  return { title: entry.action, note: "" };
}

export function targetHref(entry: AuditEntry) {
  if (entry.target_type === "driver") return `/drivers/${entry.target_id}`;
  if (entry.target_type === "ride") return `/rides/${entry.target_id}`;
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
