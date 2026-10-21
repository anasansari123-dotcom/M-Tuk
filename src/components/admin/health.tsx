"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

type Health =
  | { state: "checking" }
  | { state: "ok"; ms: number; at: Date }
  | { state: "down"; reason: string; at: Date }
  | { state: "unconfigured" };

// GET /health on the Render backend returns {"status":"ok"} and nothing else, so this
// reports reachability and latency only. Free Render instances can take ~a minute to wake.
export function useBackendHealth() {
  const [health, setHealth] = useState<Health>(env.apiUrl ? { state: "checking" } : { state: "unconfigured" });

  const check = useCallback(async () => {
    if (!env.apiUrl) return;
    setHealth({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    const started = performance.now();
    try {
      const response = await fetch(`${env.apiUrl}/health`, { signal: controller.signal, cache: "no-store" });
      const body = (await response.json().catch(() => null)) as { status?: string } | null;
      if (response.ok && body?.status === "ok") {
        setHealth({ state: "ok", ms: Math.round(performance.now() - started), at: new Date() });
      } else {
        setHealth({ state: "down", reason: `Responded with HTTP ${response.status}`, at: new Date() });
      }
    } catch (error) {
      const reason = error instanceof DOMException && error.name === "AbortError" ? "No response within 60 seconds" : "Could not reach the server";
      setHealth({ state: "down", reason, at: new Date() });
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one network check on mount
    void check();
  }, [check]);

  return { health, check };
}

export function HealthPill() {
  const { health, check } = useBackendHealth();
  const dot =
    health.state === "ok" ? "bg-success" : health.state === "down" ? "bg-destructive" : health.state === "checking" ? "bg-warning animate-pulse" : "bg-muted-foreground";
  const text =
    health.state === "ok"
      ? `Operational · ${health.ms} ms`
      : health.state === "down"
        ? health.reason
        : health.state === "checking"
          ? "Checking… (may take a minute if the server is waking up)"
          : "NEXT_PUBLIC_API_URL is not set";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full", dot)} aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">Backend API</p>
          <p className="truncate text-muted-foreground">{text}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={check} disabled={health.state === "checking" || health.state === "unconfigured"} aria-label="Check backend health again">
        <RefreshCw className={cn(health.state === "checking" && "animate-spin")} />
      </Button>
    </div>
  );
}
