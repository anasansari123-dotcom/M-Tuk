"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const presets = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function RangeFilter({
  current,
  fromInput,
  toInput,
  allowAll = false,
}: {
  current: string | null;
  fromInput: string;
  toInput: string;
  allowAll?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(current === "custom");
  const [from, setFrom] = useState(fromInput);
  const [to, setTo] = useState(toInput);

  function href(range: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    next.delete("from");
    next.delete("to");
    if (range) next.set("range", range);
    else next.delete("range");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const options = allowAll ? [{ key: null as string | null, label: "All time" }, ...presets] : presets;
  const item = "inline-flex h-8 items-center rounded-md px-2.5 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-2 sm:items-end print:hidden">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1" role="group" aria-label="Date range">
        {options.map((option) => {
          const active = current === option.key;
          return (
            <Link
              key={option.label}
              href={href(option.key)}
              aria-current={active ? "true" : undefined}
              className={cn(item, active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {option.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(item, "gap-1.5", current === "custom" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          <CalendarRange className="size-3.5" aria-hidden /> Custom
        </button>
      </div>
      {open ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!from || !to || from > to) return;
            const next = new URLSearchParams(searchParams.toString());
            next.delete("page");
            next.set("range", "custom");
            next.set("from", from);
            next.set("to", to);
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} required className="h-8 rounded-md border bg-background px-2 text-sm text-foreground" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            To
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} required className="h-8 rounded-md border bg-background px-2 text-sm text-foreground" />
          </label>
          <Button type="submit" size="sm" disabled={!from || !to || from > to}>
            Apply
          </Button>
        </form>
      ) : null}
    </div>
  );
}
