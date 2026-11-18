"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { BadgeCheck, Clock, Loader2, MapPinOff, Phone, Radio, Search, ShieldAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const POLL_MS = 15_000;
const defaultCenter = { lat: 28.6139, lng: 77.209 };

type LiveDriver = {
  provider_id: string;
  name: string;
  vehicle_number: string;
  vehicle_model: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
  on_trip: boolean;
};

type DriverDetails = {
  provider_id: string;
  name: string;
  phone: string;
  vehicle_number: string;
  vehicle_model: string;
  verification_status: string;
  verified_at: string | null;
  license_number: string;
  license_expiry: string | null;
  city: string;
  selfie_path: string;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  updated_at: string | null;
  is_online: boolean;
  ride: { id: string; status: string; pickup: string; dropoff: string } | null;
};

function secondsAgo(value: string | null, now: number) {
  if (!value) return "—";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min ago`;
}

function kmh(speed: number | null) {
  if (speed === null || speed < 0) return "—";
  return `${Math.round(speed * 3.6)} km/h`;
}

function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function FitOnce({ drivers }: { drivers: LiveDriver[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || done.current || drivers.length === 0 || typeof google === "undefined") return;
    const bounds = new google.maps.LatLngBounds();
    drivers.forEach((driver) => bounds.extend({ lat: driver.lat, lng: driver.lng }));
    map.fitBounds(bounds, 80);
    if (drivers.length === 1) map.setZoom(16);
    done.current = true;
  }, [map, drivers]);
  return null;
}

function PanTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
  }, [map, target]);
  return null;
}

function RickshawMarker({ driver, selected }: { driver: LiveDriver; selected: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "grid size-9 place-items-center rounded-full border-2 border-white text-lg shadow-md transition-transform",
          driver.on_trip ? "bg-[#079BE5]" : "bg-[#00A84F]",
          selected && "scale-125 ring-4 ring-[#FFAA00]/60",
        )}
      >
        <span aria-hidden>🛺</span>
      </div>
      {selected ? (
        <span className="mt-1 rounded bg-[#042D58] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow">
          {driver.vehicle_number}
        </span>
      ) : null}
    </div>
  );
}

export function TrafficMap({ isOfficer }: { isOfficer: boolean }) {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<DriverDetails | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await getBrowserClient().rpc("traffic_live_drivers");
    setLoaded(true);
    if (rpcError) {
      setError(
        rpcError.code === "PGRST202" || rpcError.message.includes("traffic_live_drivers")
          ? "Traffic map is not set up yet. Run supabase/traffic.sql in Supabase."
          : "Could not refresh positions. Showing the last data received.",
      );
      return;
    }
    setError(null);
    setDrivers((data ?? []) as LiveDriver[]);
    setLastSync(Date.now());
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive && document.visibilityState === "visible") void load();
    };
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 5_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(interval);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const openDriver = useCallback(async (driver: LiveDriver) => {
    setSelectedId(driver.provider_id);
    setPanTarget({ lat: driver.lat, lng: driver.lng });
    setDetails(null);
    setPhoto(null);
    setDetailsError(null);
    setDetailsLoading(true);
    const supabase = getBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("traffic_driver_details", { p_provider_id: driver.provider_id });
    if (rpcError || !data) {
      setDetailsLoading(false);
      setDetailsError("Could not load this driver's details.");
      return;
    }
    const next = data as DriverDetails;
    setDetails(next);
    if (next.selfie_path) {
      const signed = await supabase.storage.from("partner-documents").createSignedUrl(next.selfie_path, 600);
      setPhoto(signed.data?.signedUrl ?? null);
    }
    setDetailsLoading(false);
  }, []);

  const close = () => {
    setSelectedId(null);
    setDetails(null);
    setPhoto(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return drivers;
    return drivers.filter(
      (driver) => driver.vehicle_number.toLowerCase().replace(/\s+/g, "").includes(q) || driver.name.toLowerCase().includes(q),
    );
  }, [drivers, query]);

  const onTrip = drivers.filter((driver) => driver.on_trip).length;
  const licenceExpired = details?.license_expiry ? new Date(details.license_expiry).getTime() < now : false;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Online now", value: drivers.length, tone: "text-foreground" },
            { label: "Available", value: drivers.length - onTrip, tone: "text-[#00A84F]" },
            { label: "On a trip", value: onTrip, tone: "text-[#079BE5]" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-extrabold tabular-nums", stat.tone)}>{loaded ? stat.value : "–"}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radio className={cn("size-3.5", error ? "text-destructive" : "text-[#00A84F]")} aria-hidden />
            {error ? "Updates paused" : `Refreshes every ${POLL_MS / 1000}s`}
          </span>
          <span>Last updated {lastSync ? secondsAgo(new Date(lastSync).toISOString(), now) : "—"}</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-[#00A84F]" aria-hidden /> Available</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-[#079BE5]" aria-hidden /> On a trip</span>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="relative h-[62dvh] min-h-96 overflow-hidden rounded-xl border bg-muted lg:h-[calc(100dvh-220px)]">
          {env.mapsKey ? (
            <APIProvider apiKey={env.mapsKey} onError={() => setError("Google Maps failed to load. Check the browser key restrictions.")}>
              <Map
                mapId={env.mapId || "DEMO_MAP_ID"}
                defaultCenter={defaultCenter}
                defaultZoom={12}
                gestureHandling="greedy"
                streetViewControl={false}
                mapTypeControl={false}
                className="h-full w-full"
                onClick={close}
              >
                <FitOnce drivers={drivers} />
                <PanTo target={panTarget} />
                {drivers.map((driver) => (
                  <AdvancedMarker
                    key={driver.provider_id}
                    position={{ lat: driver.lat, lng: driver.lng }}
                    title={`${driver.vehicle_number} · ${driver.name}`}
                    onClick={() => void openDriver(driver)}
                    zIndex={driver.provider_id === selectedId ? 100 : 1}
                  >
                    <RickshawMarker driver={driver} selected={driver.provider_id === selectedId} />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="max-w-sm space-y-2">
                <MapPinOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
                <p className="font-medium">Map not configured</p>
                <p className="text-sm text-muted-foreground">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. The list on the right still works.</p>
              </div>
            </div>
          )}
          {loaded && drivers.length === 0 && !error ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-full border bg-card px-4 py-1.5 text-sm shadow-sm">
              No e-rickshaw is online right now
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-3">
        {selectedId ? (
          <section className="overflow-hidden rounded-xl border bg-card" aria-live="polite">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-sm font-semibold">Driver details</p>
              <button type="button" onClick={close} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Close details">
                <X className="size-4" />
              </button>
            </div>
            {detailsLoading ? (
              <div className="grid h-48 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>
            ) : detailsError ? (
              <p className="p-4 text-sm text-destructive">{detailsError}</p>
            ) : details ? (
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="size-24 shrink-0 overflow-hidden rounded-2xl border bg-muted">
                    {photo ? (
                      // Short-lived signed URL from private storage.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={`Photo of ${details.name}`} className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-3xl font-bold text-muted-foreground">
                        {details.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{details.name}</p>
                    <p className="mt-0.5 inline-block rounded-md border-2 border-[#042D58] bg-[#FFF4D9] px-2 py-0.5 font-mono text-sm font-bold tracking-wider">
                      {details.vehicle_number}
                    </p>
                    <p className="mt-1">
                      {details.verification_status === "approved" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00A84F]"><BadgeCheck className="size-3.5" aria-hidden /> MTUK verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><ShieldAlert className="size-3.5" aria-hidden /> Not verified ({details.verification_status})</span>
                      )}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Mobile</dt><dd className="font-medium">{details.phone || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Vehicle model</dt><dd>{details.vehicle_model || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Licence number</dt><dd className="font-mono text-xs">{details.license_number || "—"}</dd></div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Licence valid till</dt>
                    <dd className={cn(licenceExpired && "font-semibold text-destructive")}>{formatDay(details.license_expiry)}{licenceExpired ? " (expired)" : ""}</dd>
                  </div>
                  <div><dt className="text-xs text-muted-foreground">City</dt><dd>{details.city || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Speed</dt><dd>{kmh(details.speed)}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Location updated</dt><dd className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" aria-hidden />{secondsAgo(details.updated_at, now)}</dd></div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Current status</dt>
                    <dd>{details.ride ? `On a trip: ${details.ride.pickup} → ${details.ride.dropoff}` : "Available, no passenger"}</dd>
                  </div>
                </dl>

                <div className="flex gap-2">
                  {details.phone ? (
                    <a href={`tel:+91${details.phone}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00A84F] text-sm font-semibold text-white hover:bg-[#059669]">
                      <Phone className="size-4" aria-hidden /> Call driver
                    </a>
                  ) : null}
                  {details.lat !== null && details.lng !== null ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${details.lat},${details.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-semibold hover:bg-muted"
                    >
                      Directions
                    </a>
                  ) : null}
                </div>
                {isOfficer ? <p className="text-[11px] text-muted-foreground">This lookup is recorded in the MTUK audit log.</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-3">
            <label htmlFor="traffic-search" className="sr-only">Search by vehicle number or name</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="traffic-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Vehicle number or driver name"
                className="h-10 pl-9 uppercase placeholder:normal-case"
                autoComplete="off"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query ? "No online e-rickshaw matches. It may be offline." : loaded ? "No e-rickshaw is online." : "Loading…"}
            </p>
          ) : (
            <ul className="max-h-[50dvh] divide-y overflow-y-auto">
              {filtered.map((driver) => (
                <li key={driver.provider_id}>
                  <button
                    type="button"
                    onClick={() => void openDriver(driver)}
                    aria-pressed={driver.provider_id === selectedId}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted", driver.provider_id === selectedId && "bg-accent")}
                  >
                    <span className={cn("size-2.5 shrink-0 rounded-full", driver.on_trip ? "bg-[#079BE5]" : "bg-[#00A84F]")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold">{driver.vehicle_number}</span>
                      <span className="block truncate text-xs text-muted-foreground">{driver.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{secondsAgo(driver.updated_at, now)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
