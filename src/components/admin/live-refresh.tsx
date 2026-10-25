"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// Tables whose changes should re-render the page the admin is looking at.
const watchedTables = ["rides", "passengers", "providers", "partner_applications", "contact_messages", "admin_audit_log"];

// Fallback in case Realtime is not enabled for a table or the socket drops.
const pollMs = 30_000;

// Re-runs the server components of the current page (router.refresh) whenever the data changes,
// so every CRM section shows live numbers without a manual reload. Filters and open dialogs keep their state.
export function LiveRefresh() {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "live" | "polling">("connecting");
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setUpdatedAt(new Date());
    };
    // Batch bursts (a ride moving through several statuses) into one refresh.
    const queue = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, 1000);
    };

    const supabase = getBrowserClient();
    let channel = supabase.channel("admin-live-refresh");
    for (const table of watchedTables) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, queue);
    }
    channel.subscribe((state: string) => {
      setStatus(state === "SUBSCRIBED" ? "live" : state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED" ? "polling" : "connecting");
    });

    const interval = setInterval(refresh, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "medium", timeZone: "Asia/Kolkata" }).format(updatedAt);

  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex"
      title={status === "live" ? "Data updates automatically when anything changes" : "Refreshing every 30 seconds"}
      suppressHydrationWarning
    >
      <Radio className={cn("size-3.5", status === "live" ? "text-success" : status === "polling" ? "text-warning" : "text-muted-foreground")} aria-hidden />
      {status === "live" ? "Live" : status === "polling" ? "Auto-refresh" : "Connecting…"} · {time}
    </span>
  );
}
