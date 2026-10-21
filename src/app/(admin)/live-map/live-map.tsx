"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { MapPinOff, Radio } from "lucide-react";
import { RideStatusBadge } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { env } from "@/lib/env";
import { formatKm, formatRupees, shortId, timeAgo } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/browser";
import { activeRideStatuses, rideColumns, type Ride, type RideStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Delhi, the same default the backend uses for place search.
const defaultCenter = { lat: 28.6139, lng: 77.209 };

const pinColor: Record<RideStatus, string> = {
  requested: "#d97706",
  accepted: "#2a78d6",
  arriving: "#2a78d6",
  ongoing: "#15935a",
  completed: "#64748b",
  cancelled: "#dc2626",
};

function FitToRides({ rides }: { rides: Ride[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!map || fitted.current || rides.length === 0 || typeof google === "undefined") return;
    const bounds = new google.maps.LatLngBounds();
    rides.forEach((ride) => {
      bounds.extend({ lat: ride.pickup_lat, lng: ride.pickup_lng });
      bounds.extend({ lat: ride.drop_lat, lng: ride.drop_lng });
    });
    map.fitBounds(bounds, 64);
    fitted.current = true;
  }, [map, rides]);
  return null;
}

export function LiveMap({ initialRides, initialError }: { initialRides: Ride[]; initialError: string | null }) {
  const [rides, setRides] = useState(initialRides);
  const [error, setError] = useState(initialError);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(() => new Date());
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [, setTick] = useState(0);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await getBrowserClient()
      .from("rides")
      .select(rideColumns)
      .in("status", activeRideStatuses)
      .order("created_at", { ascending: false })
      .limit(200);
    if (fetchError) {
      setError("Could not refresh rides. Showing the last data received.");
      return;
    }
    setError(null);
    setRides((data ?? []) as Ride[]);
    setLastSync(new Date());
  }, []);

  // One channel for this page only; changes are batched into a single refetch.
  useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("admin-live-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refetch(), 800);
      })
      .subscribe((status: string) => {
        setLive(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "offline" : "connecting");
      });
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Re-render relative times once a minute.
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const selected = useMemo(() => rides.find((ride) => ride.id === selectedId) ?? null, [rides, selectedId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radio className={cn("size-4", live === "live" ? "text-success" : live === "offline" ? "text-destructive" : "text-warning")} aria-hidden />
            {live === "live" ? "Live updates on" : live === "offline" ? "Live updates unavailable" : "Connecting…"}
          </span>
          <span>Last updated {timeAgo(lastSync.toISOString())}</span>
          <span className="inline-flex items-center gap-3">
            {(["requested", "accepted", "ongoing"] as RideStatus[]).map((status) => (
              <span key={status} className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full" style={{ background: pinColor[status] }} aria-hidden />
                {status === "requested" ? "Searching" : status === "accepted" ? "Driver assigned" : "In progress"}
              </span>
            ))}
          </span>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="relative h-[60vh] min-h-96 overflow-hidden rounded-xl border bg-muted">
          {env.mapsKey ? (
            <APIProvider apiKey={env.mapsKey} onError={() => setError("Google Maps failed to load. Check the browser key and its website restrictions.")}>
              <Map
                mapId={env.mapId || "DEMO_MAP_ID"}
                defaultCenter={defaultCenter}
                defaultZoom={11}
                gestureHandling="greedy"
                disableDefaultUI={false}
                streetViewControl={false}
                mapTypeControl={false}
                className="h-full w-full"
              >
                <FitToRides rides={rides} />
                {rides.map((ride) => (
                  <AdvancedMarker
                    key={`p-${ride.id}`}
                    position={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
                    title={`Pickup: ${ride.pickup} (${ride.status})`}
                    onClick={() => setSelectedId(ride.id)}
                    zIndex={ride.id === selectedId ? 10 : 1}
                  >
                    <Pin background={pinColor[ride.status]} borderColor="#ffffff" glyphColor="#ffffff" glyphText="P" scale={ride.id === selectedId ? 1.2 : 0.9} />
                  </AdvancedMarker>
                ))}
                {selected ? (
                  <AdvancedMarker position={{ lat: selected.drop_lat, lng: selected.drop_lng }} title={`Destination: ${selected.dropoff}`} zIndex={11}>
                    <Pin background="#1e293b" borderColor="#ffffff" glyphColor="#ffffff" glyphText="D" />
                  </AdvancedMarker>
                ) : null}
              </Map>
            </APIProvider>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="max-w-sm space-y-2">
                <MapPinOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
                <p className="font-medium">Map not configured</p>
                <p className="text-sm text-muted-foreground">
                  Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (a browser key restricted to this website and the Maps JavaScript API). The ride list still works.
                </p>
              </div>
            </div>
          )}
          {rides.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-full border bg-card px-4 py-1.5 text-sm shadow-sm">
              No active rides right now
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-3">
        {selected ? (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">Ride {shortId(selected.id)}</p>
                <p className="font-medium">{selected.passenger_name}</p>
              </div>
              <RideStatusBadge status={selected.status} />
            </div>
            <dl className="space-y-1.5 text-sm">
              <div><dt className="text-xs text-muted-foreground">Pickup (P)</dt><dd>{selected.pickup}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Destination (D)</dt><dd>{selected.dropoff}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Driver</dt><dd>{selected.driver_name ? `${selected.driver_name} · ${selected.vehicle_number ?? ""}` : "Not assigned"}</dd></div>
              <div className="flex gap-6">
                <div><dt className="text-xs text-muted-foreground">Distance</dt><dd>{formatKm(selected.distance_km)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Quoted fare</dt><dd>{formatRupees(selected.fare)}</dd></div>
              </div>
              <div><dt className="text-xs text-muted-foreground">Last status change</dt><dd>{timeAgo(selected.updated_at)}</dd></div>
            </dl>
            <div className="flex gap-3 text-sm">
              <Link href={`/rides/${selected.id}`} className="font-medium text-primary hover:underline">Open ride</Link>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedId(null)}>Clear</button>
            </div>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-xl border bg-card">
          <p className="border-b px-4 py-2.5 text-sm font-medium">Active rides ({rides.length}{rides.length === 200 ? "+" : ""})</p>
          {rides.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing in progress. New bookings appear here automatically.</p>
          ) : (
            <ul className="max-h-[50vh] divide-y overflow-y-auto">
              {rides.map((ride) => (
                <li key={ride.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(ride.id)}
                    aria-pressed={ride.id === selectedId}
                    className={cn("w-full px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none", ride.id === selectedId && "bg-accent")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{ride.pickup} → {ride.dropoff}</span>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: pinColor[ride.status] }} aria-hidden />
                    </div>
                    <p className="text-xs text-muted-foreground">{ride.passenger_name} · {timeAgo(ride.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
