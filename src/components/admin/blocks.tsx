import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, partnerLabel, rideStatusLabel, verificationLabel } from "@/lib/format";
import { withParams, type SearchParams } from "@/lib/params";
import type { PartnerStatus, RideStatus, VerificationStatus } from "@/lib/types";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 space-y-2">
      {back ? (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: number | string | null | undefined;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "green" | "amber" | "red" | "blue";
  href?: string;
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    green: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
    red: "bg-destructive/10 text-destructive",
    blue: "bg-info-soft text-info",
  }[tone];
  const display = value === null || value === undefined ? "—" : typeof value === "number" ? formatNumber(value) : value;
  const body = (
    <Card className="h-full gap-0 p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", toneClass)}>
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{display}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring [&:hover_[data-slot=card]]:border-primary/40">
      {body}
    </Link>
  ) : (
    body
  );
}

const rideTone: Record<RideStatus, string> = {
  requested: "bg-warning-soft text-warning",
  accepted: "bg-info-soft text-info",
  arriving: "bg-info-soft text-info",
  ongoing: "bg-success-soft text-success",
  completed: "bg-muted text-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", rideTone[status] ?? "bg-muted")}>
      {rideStatusLabel[status] ?? status}
    </span>
  );
}

const verificationTone: Record<VerificationStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-muted text-foreground",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", verificationTone[status] ?? "bg-muted")}>
      {verificationLabel[status] ?? status}
    </span>
  );
}

export function PartnerBadge({ status }: { status: PartnerStatus }) {
  const tone = verificationTone[status] ?? "bg-muted";
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", tone)}>
      {partnerLabel[status] ?? status}
    </span>
  );
}

export function EmptyState({ title, body, icon: Icon = Inbox }: { title: string; body?: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {body ? <p className="max-w-md text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function Pagination({
  path,
  params,
  page,
  total,
  pageSize,
}: {
  path: string;
  params: SearchParams;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const linkClass =
    "inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
  const disabledClass = "pointer-events-none opacity-40";
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row print:hidden">
      <p>
        {total === 0 ? "No results" : `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={withParams(path, params, { page: String(page - 1) })}
          className={cn(linkClass, page <= 1 && disabledClass)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
        >
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Link>
        <span className="tabular-nums">
          Page {page} of {pages}
        </span>
        <Link
          href={withParams(path, params, { page: String(page + 1) })}
          className={cn(linkClass, page >= pages && disabledClass)}
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
        >
          Next <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function FilterTabs({
  path,
  params,
  name,
  options,
  current,
}: {
  path: string;
  params: SearchParams;
  name: string;
  options: { value: string | null; label: string; count?: number | null }[];
  current: string | null;
}) {
  return (
    <nav aria-label="Filter" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((option) => {
        const active = (option.value ?? null) === (current ?? null);
        return (
          <Link
            key={option.label}
            href={withParams(path, params, { [name]: option.value })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && option.count !== null ? (
              <span className={cn("rounded px-1 text-xs tabular-nums", active ? "bg-background/20" : "bg-muted")}>{formatNumber(option.count)}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function TableCard({ toolbar, children, footer }: { toolbar?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      {toolbar ? <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">{toolbar}</div> : null}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </Card>
  );
}

export function Section({ title, description, actions, children, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="font-medium">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div>{children}</div>
    </Card>
  );
}

export function KeyValues({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="col-span-2 min-w-0 break-words">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Unsupported({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 border-dashed p-6">
      <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Not available yet</span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}
