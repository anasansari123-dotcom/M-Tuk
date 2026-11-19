"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  Map,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  BadgeCheck,
  Clock,
  Crosshair,
  Expand,
  Loader2,
  MapPin,
  MapPinOff,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// Matches the driver app, which sends a fix about every 5 s while moving.
const POLL_MS = 5_000;
const defaultCenter = { lat: 28.6139, lng: 77.209 };
// APIProvider re-runs its loader whenever `libraries` or `onError` change identity. Its default
// `libraries = []` is a new array on every render, so pass a constant to stop map reload loops.
const MAP_LIBRARIES: string[] = ["places"];
const MAP_ERROR =
  "Google Maps failed to load. Check that billing is enabled for the browser key's Google Cloud project and that the key allows this website.";

type Filter = "live" | "offline" | "all";

type TrafficDriver = {
  provider_id: string;
  name: string;
  phone: string;
  vehicle_number: string;
  vehicle_model: string;
  verification_status: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  updated_at: string | null;
  is_live: boolean;
  on_trip: boolean;
};

type DriverDetails = {
  provider_id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_number: string;
  vehicle_model: string;
  verification_status: string;
  verified_at: string | null;
  joined_at?: string | null;
  license_number: string;
  license_expiry: string | null;
  city: string;
  selfie_path: string;
  vehicle_photo_path?: string;
  license_photo_path?: string;
  rc_photo_path?: string;
  completed_trips?: number;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  accuracy?: number | null;
  updated_at: string | null;
  is_online: boolean;
  ride: { id: string; status: string; pickup: string; dropoff: string; passenger_name?: string } | null;
};

type Photo = { label: string; url: string };
type Point = { lat: number; lng: number };

function timeAgo(value: string | null, now: number) {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function kmh(speed: number | null) {
  if (speed === null || speed < 0) return "—";
  return `${Math.round(speed * 3.6)} km/h`;
}

function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function hasPosition(driver: TrafficDriver): driver is TrafficDriver & { lat: number; lng: number } {
  return driver.lat !== null && driver.lng !== null;
}

function statusOf(driver: { is_live: boolean; on_trip: boolean }) {
  if (!driver.is_live) return { label: "Offline", dot: "bg-slate-400", marker: "bg-slate-400" };
  if (driver.on_trip) return { label: "On a trip", dot: "bg-[#079BE5]", marker: "bg-[#079BE5]" };
  return { label: "Available", dot: "bg-[#00A84F]", marker: "bg-[#00A84F]" };
}

// Fits the map to the live e-rickshaws once, the first time any arrive.
function FitOnce({ points }: { points: Point[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || done.current || points.length === 0 || typeof google === "undefined") return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 80);
    if (points.length === 1) map.setZoom(16);
    done.current = true;
  }, [map, points]);
  return null;
}

function PanTo({ target }: { target: { point: Point; zoom: number; at: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target.point);
    if ((map.getZoom() ?? 0) < target.zoom) map.setZoom(target.zoom);
  }, [map, target]);
  return null;
}

function FitAllButton({ points }: { points: Point[] }) {
  const map = useMap();
  return (
    <button
      type="button"
      disabled={!map || points.length === 0}
      onClick={() => {
        if (!map || points.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 80);
        if (points.length === 1) map.setZoom(16);
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
      title="Show all e-rickshaws"
    >
      <Expand className="size-4" aria-hidden /> <span className="hidden sm:inline">Show all</span>
    </button>
  );
}

// Search any area / landmark (Places API New) and move the map there.
function PlaceSearch({ onPick }: { onPick: (place: { point: Point; label: string }) => void }) {
  const places = useMapsLibrary("places");
  const map = useMap();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!places || text.trim().length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      token.current ??= new places.AutocompleteSessionToken();
      try {
        const center = map?.getCenter();
        const { suggestions: found } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text.trim(),
          sessionToken: token.current,
          includedRegionCodes: ["in"],
          ...(center ? { locationBias: { center: center.toJSON(), radius: 30000 } } : {}),
        });
        if (cancelled) return;
        setFailed(false);
        setSuggestions(found.flatMap((item) => (item.placePrediction ? [item.placePrediction] : [])).slice(0, 6));
        setOpen(true);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSuggestions([]);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, map, text]);

  const pick = async (prediction: google.maps.places.PlacePrediction) => {
    setBusy(true);
    setOpen(false);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["location", "displayName", "viewport"] });
      token.current = null;
      if (place.viewport && map) map.fitBounds(place.viewport);
      if (place.location) {
        onPick({ point: place.location.toJSON(), label: place.displayName ?? prediction.text.toString() });
      }
      setText(place.displayName ?? prediction.text.toString());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (event.target.value.trim().length < 3) {
            setSuggestions([]);
            setOpen(false);
          }
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search area, road or landmark"
        aria-label="Search a place on the map"
        className="h-10 w-full rounded-lg border bg-background pr-9 pl-9 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#00A84F]/40"
        autoComplete="off"
      />
      {busy ? (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : text ? (
        <button
          type="button"
          onClick={() => {
            setText("");
            setSuggestions([]);
            setOpen(false);
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {open && (suggestions.length > 0 || failed) ? (
        <ul className="absolute inset-x-0 top-11 z-30 overflow-hidden rounded-lg border bg-background shadow-lg">
          {failed ? (
            <li className="px-3 py-2.5 text-sm text-destructive">Place search failed. Check that Places API (New) is enabled for the browser key.</li>
          ) : (
            suggestions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void pick(prediction)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{prediction.mainText?.toString() ?? prediction.text.toString()}</span>
                    <span className="block truncate text-xs text-muted-foreground">{prediction.secondaryText?.toString() ?? ""}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

// Top-down e-rickshaw (front = up). Rotated to the direction of travel by LiveRickshaw.
function RickshawTopView({ body, roof, trim }: { body: string; roof: string; trim: string }) {
  return (
    <svg viewBox="0 0 40 56" width="30" height="42" aria-hidden>
      <ellipse cx="21" cy="31" rx="15" ry="23" fill="#000" opacity="0.18" />
      <rect x="3" y="35" width="5" height="12" rx="2" fill="#1f2937" />
      <rect x="32" y="35" width="5" height="12" rx="2" fill="#1f2937" />
      <rect x="17.5" y="1.5" width="5" height="9" rx="2" fill="#1f2937" />
      <path d="M13 8 Q20 4 27 8 L33 21 L33 50 Q33 54 29 54 L11 54 Q7 54 7 50 L7 21 Z" fill={body} stroke="#fff" strokeWidth="1.6" />
      <path d="M11.5 19 Q20 13.5 28.5 19 L28.5 22 L11.5 22 Z" fill="#BFE6FF" />
      <rect x="9" y="22" width="22" height="29" rx="4" fill={roof} stroke={trim} strokeWidth="1" />
      <line x1="11" y1="31" x2="29" y2="31" stroke={trim} strokeWidth="1" />
      <line x1="11" y1="41" x2="29" y2="41" stroke={trim} strokeWidth="1" />
      <circle cx="20" cy="7" r="1.8" fill="#FFF7C2" />
    </svg>
  );
}

const MOVE_MS = 4_500; // glide time between two GPS fixes (a bit under the poll interval)

function bearing(from: Point, to: Point) {
  const rad = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * rad) * Math.cos(to.lat * rad);
  const x =
    Math.cos(from.lat * rad) * Math.sin(to.lat * rad) -
    Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos((to.lng - from.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

function metersBetween(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// Shortest turn between two compass angles, so 350° -> 10° turns 20°, not 340°.
function turn(from: number, to: number, k: number) {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * k + 360) % 360;
}

// Marker that glides to each new GPS fix and turns to face the direction of travel.
// Position and rotation are written straight to the marker / DOM on every frame, without React re-renders.
function LiveRickshaw({
  driver,
  selected,
  onOpen,
}: {
  driver: TrafficDriver & { lat: number; lng: number };
  selected: boolean;
  onOpen: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const iconRef = useRef<HTMLDivElement>(null);
  const [startPosition] = useState<Point>(() => ({ lat: driver.lat, lng: driver.lng }));
  const current = useRef<{ point: Point; heading: number } | null>(null);
  const status = statusOf(driver);

  useEffect(() => {
    if (!marker) return;
    const target = { lat: driver.lat, lng: driver.lng };
    const from = current.current ?? { point: target, heading: driver.heading !== null && driver.heading >= 0 ? driver.heading : 0 };
    const moved = metersBetween(from.point, target);
    const gpsHeading = driver.heading !== null && driver.heading >= 0 && (driver.speed ?? 0) > 0.5 ? driver.heading : null;
    const toHeading = moved > 4 ? bearing(from.point, target) : gpsHeading ?? from.heading;
    // Jumps over ~1.5 km (app reopened far away) snap instead of sliding across the city.
    const duration = moved > 1500 || moved < 0.5 ? 0 : MOVE_MS;
    const start = performance.now();
    let frame = 0;

    const step = (time: number) => {
      const k = duration ? Math.min(1, (time - start) / duration) : 1;
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const point = {
        lat: from.point.lat + (target.lat - from.point.lat) * eased,
        lng: from.point.lng + (target.lng - from.point.lng) * eased,
      };
      const heading = turn(from.heading, toHeading, Math.min(1, k * 3));
      marker.position = point;
      if (iconRef.current) iconRef.current.style.transform = `rotate(${heading}deg)`;
      current.current = { point, heading };
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [marker, driver.lat, driver.lng, driver.heading, driver.speed]);

  const colors = !driver.is_live
    ? { body: "#94a3b8", roof: "#cbd5e1", trim: "#94a3b8" }
    : driver.on_trip
      ? { body: "#079BE5", roof: "#FFC21A", trim: "#D99A00" }
      : { body: "#00A84F", roof: "#FFC21A", trim: "#D99A00" };

  return (
    <AdvancedMarker
      ref={markerRef}
      position={startPosition}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      title={`${driver.vehicle_number} · ${driver.name} · ${status.label}`}
      onClick={onOpen}
      zIndex={selected ? 1000 : driver.is_live ? 10 : 1}
    >
      <div className="relative grid place-items-center">
        {selected ? <span className="absolute size-14 rounded-full bg-[#FFAA00]/30 ring-2 ring-[#FFAA00]" aria-hidden /> : null}
        {driver.is_live && !selected ? <span className="absolute size-10 animate-ping rounded-full opacity-20" style={{ background: colors.body }} aria-hidden /> : null}
        <div ref={iconRef} className="relative will-change-transform" style={{ transform: "rotate(0deg)" }}>
          <RickshawTopView {...colors} />
        </div>
        <span
          className={cn(
            "absolute top-full mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap shadow",
            selected ? "bg-[#042D58] text-white" : "bg-white/95 text-[#042D58]",
            !selected && !driver.is_live && "opacity-70",
          )}
        >
          {driver.vehicle_number || "—"}
        </span>
      </div>
    </AdvancedMarker>
  );
}

function PhotoGrid({ photos, onOpen }: { photos: Photo[]; onOpen: (photo: Photo) => void }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photo) => (
        <button
          key={photo.label}
          type="button"
          onClick={() => onOpen(photo)}
          className="group overflow-hidden rounded-lg border bg-muted text-left"
        >
          {/* Short-lived signed URLs from private storage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.label} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
          <span className="block px-2 py-1 text-[11px] font-medium text-muted-foreground">{photo.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TrafficMap({ isOfficer }: { isOfficer: boolean }) {
  const [drivers, setDrivers] = useState<TrafficDriver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [setupNote, setSetupNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<DriverDetails | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ point: Point; zoom: number; at: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [me, setMe] = useState<Point | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [searched, setSearched] = useState<{ point: Point; label: string } | null>(null);
  const onMapError = useCallback(() => setMapError(MAP_ERROR), []);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    setSyncing(true);
    const supabase = getBrowserClient();
    const all = await supabase.rpc("traffic_all_drivers");
    let rows: TrafficDriver[] | null = null;
    let failure = all.error;

    if (all.error && (all.error.code === "PGRST202" || all.error.message.includes("traffic_all_drivers"))) {
      // traffic-v2.sql not run yet: fall back to online-only positions.
      const live = await supabase.rpc("traffic_live_drivers");
      failure = live.error;
      if (!live.error) {
        setSetupNote("Showing online e-rickshaws only. Run supabase/traffic-v2.sql in Supabase to list every registered driver with photos.");
        rows = ((live.data ?? []) as Omit<TrafficDriver, "is_live" | "phone" | "verification_status">[]).map((row) => ({
          ...row,
          phone: "",
          verification_status: "approved",
          is_live: true,
        }));
      }
    } else if (!all.error) {
      setSetupNote(null);
      rows = (all.data ?? []) as TrafficDriver[];
    }

    setLoaded(true);
    setSyncing(false);
    if (!rows) {
      setError(
        failure?.code === "PGRST202" || failure?.message.includes("traffic_live_drivers")
          ? "Traffic map is not set up yet. Run supabase/traffic.sql and supabase/traffic-v2.sql in Supabase."
          : "Could not refresh positions. Check your internet. Showing the last data received.",
      );
      return;
    }
    setError(null);
    setDrivers(rows);
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

  const openDriver = useCallback(async (driver: TrafficDriver) => {
    const id = ++requestId.current;
    setSelectedId(driver.provider_id);
    if (hasPosition(driver)) setPanTarget({ point: { lat: driver.lat, lng: driver.lng }, zoom: 16, at: Date.now() });
    setDetails(null);
    setPhotos([]);
    setDetailsError(null);
    setDetailsLoading(true);
    const supabase = getBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("traffic_driver_details", { p_provider_id: driver.provider_id });
    if (id !== requestId.current) return;
    if (rpcError || !data) {
      setDetailsLoading(false);
      setDetailsError("Could not load this driver's details. Check your internet and try again.");
      return;
    }
    const next = data as DriverDetails;
    setDetails(next);
    setDetailsLoading(false);

    const wanted = [
      { label: "Driver photo", path: next.selfie_path },
      { label: "Vehicle photo", path: next.vehicle_photo_path ?? "" },
      { label: "Driving licence", path: next.license_photo_path ?? "" },
      { label: "Vehicle RC", path: next.rc_photo_path ?? "" },
    ].filter((item) => item.path);
    if (wanted.length === 0) return;
    const signed = await supabase.storage.from("partner-documents").createSignedUrls(
      wanted.map((item) => item.path),
      600,
    );
    if (id !== requestId.current) return;
    const urls: { path: string | null; signedUrl: string }[] = signed.data ?? [];
    setPhotos(
      wanted.flatMap((item) => {
        const url = urls.find((entry) => entry.path === item.path)?.signedUrl;
        return url ? [{ label: item.label, url }] : [];
      }),
    );
  }, []);

  const close = useCallback(() => {
    requestId.current += 1;
    setSelectedId(null);
    setDetails(null);
    setPhotos([]);
    setDetailsLoading(false);
  }, []);

  const locateMe = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setMeError("This browser cannot share your location.");
      return;
    }
    setLocating(true);
    setMeError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMe(point);
        setPanTarget({ point, zoom: 15, at: Date.now() });
        setLocating(false);
      },
      (failure) => {
        setLocating(false);
        setMeError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location permission is blocked. Allow location for this site in the browser address bar, then try again."
            : "Could not get your location. Turn on device location and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, []);

  const counts = useMemo(() => {
    const live = drivers.filter((driver) => driver.is_live);
    return {
      total: drivers.length,
      live: live.length,
      available: live.filter((driver) => !driver.on_trip).length,
      onTrip: live.filter((driver) => driver.on_trip).length,
      offline: drivers.length - live.length,
    };
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return drivers.filter((driver) => {
      if (filter === "live" && !driver.is_live) return false;
      if (filter === "offline" && driver.is_live) return false;
      if (!q) return true;
      return (
        driver.vehicle_number.toLowerCase().replace(/\s+/g, "").includes(q) ||
        driver.name.toLowerCase().replace(/\s+/g, "").includes(q) ||
        driver.phone.includes(q)
      );
    });
  }, [drivers, filter, query]);

  const onMap = useMemo(() => filtered.filter(hasPosition), [filtered]);
  const livePoints = useMemo(
    () => drivers.filter((driver) => driver.is_live && hasPosition(driver)).map((driver) => ({ lat: driver.lat!, lng: driver.lng! })),
    [drivers],
  );
  const mapPoints = useMemo(() => onMap.map((driver) => ({ lat: driver.lat, lng: driver.lng })), [onMap]);
  const selectedDriver = drivers.find((driver) => driver.provider_id === selectedId) ?? null;
  const licenceExpired = details?.license_expiry ? new Date(details.license_expiry).getTime() < now : false;
  const selectedLive = details?.is_online ?? selectedDriver?.is_live ?? false;

  const stats = [
    { label: "Registered", value: counts.total, tone: "text-foreground" },
    { label: "Online now", value: counts.live, tone: "text-foreground" },
    { label: "Available", value: counts.available, tone: "text-[#00A84F]" },
    { label: "On a trip", value: counts.onTrip, tone: "text-[#079BE5]" },
  ];

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.total },
    { value: "live", label: "Online", count: counts.live },
    { value: "offline", label: "Offline", count: counts.offline },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-extrabold tabular-nums", stat.tone)}>{loaded ? stat.value : "–"}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radio className={cn("size-3.5", error ? "text-destructive" : "text-[#00A84F]")} aria-hidden />
            {error ? "Updates paused" : `Live · refreshes every ${POLL_MS / 1000}s`}
          </span>
          <span>Last updated {lastSync ? timeAgo(new Date(lastSync).toISOString(), now) : "—"}</span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} aria-hidden /> Refresh
          </button>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-[#00A84F]" aria-hidden /> Available</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-[#079BE5]" aria-hidden /> On a trip</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-slate-400" aria-hidden /> Offline (last seen)</span>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {mapError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{mapError}</p> : null}
        {meError ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{meError}</p> : null}
        {setupNote ? <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{setupNote}</p> : null}

        <div className="relative h-[62dvh] min-h-96 overflow-hidden rounded-xl border bg-muted lg:h-[calc(100dvh-240px)]">
          {env.mapsKey ? (
            <APIProvider apiKey={env.mapsKey} libraries={MAP_LIBRARIES} onError={onMapError}>
              <Map
                mapId={env.mapId || "DEMO_MAP_ID"}
                defaultCenter={defaultCenter}
                defaultZoom={12}
                gestureHandling="greedy"
                streetViewControl={false}
                mapTypeControl={false}
                fullscreenControl
                className="h-full w-full"
                onClick={close}
              >
                <FitOnce points={livePoints} />
                <PanTo target={panTarget} />
                {onMap.map((driver) => (
                  <LiveRickshaw
                    key={driver.provider_id}
                    driver={driver}
                    selected={driver.provider_id === selectedId}
                    onOpen={() => void openDriver(driver)}
                  />
                ))}
                {me ? (
                  <AdvancedMarker position={me} title="You are here" zIndex={500}>
                    <span className="relative grid size-5 place-items-center">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#1a73e8]/40" />
                      <span className="relative size-4 rounded-full border-2 border-white bg-[#1a73e8] shadow" />
                    </span>
                  </AdvancedMarker>
                ) : null}
                {searched ? (
                  <AdvancedMarker position={searched.point} title={searched.label} zIndex={400}>
                    <MapPin className="size-8 fill-[#FFAA00] text-[#042D58] drop-shadow" aria-hidden />
                  </AdvancedMarker>
                ) : null}
                <div className="absolute top-3 right-14 left-3 z-10 flex flex-wrap items-start gap-2">
                  <PlaceSearch
                    onPick={(place) => {
                      setSearched(place);
                      setPanTarget({ point: place.point, zoom: 15, at: Date.now() });
                    }}
                  />
                  <button
                    type="button"
                    onClick={locateMe}
                    disabled={locating}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-60"
                    title="Show my current location"
                  >
                    {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4 text-[#1a73e8]" aria-hidden />}
                    <span className="hidden sm:inline">My location</span>
                  </button>
                  <FitAllButton points={mapPoints} />
                </div>
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
          {loaded && counts.live === 0 && !error ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[90%] rounded-full border bg-card px-4 py-1.5 text-center text-sm shadow-sm">
              No e-rickshaw is online right now{counts.total > 0 ? " · grey pins show last known positions" : ""}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="min-w-0 space-y-3">
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
              <div className="max-h-[calc(100dvh-180px)] space-y-4 overflow-y-auto p-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={!photos[0]}
                    onClick={() => photos[0] && setViewer(photos[0])}
                    className="size-24 shrink-0 overflow-hidden rounded-2xl border bg-muted"
                    aria-label="Open driver photo"
                  >
                    {photos.find((photo) => photo.label === "Driver photo") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photos.find((photo) => photo.label === "Driver photo")!.url}
                        alt={`Photo of ${details.name}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-3xl font-bold text-muted-foreground">
                        {details.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{details.name}</p>
                    <p className="mt-0.5 inline-block rounded-md border-2 border-[#042D58] bg-[#FFF4D9] px-2 py-0.5 font-mono text-sm font-bold tracking-wider">
                      {details.vehicle_number || "—"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {details.verification_status === "approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#00A84F]/10 px-2 py-0.5 text-xs font-semibold text-[#00A84F]"><BadgeCheck className="size-3.5" aria-hidden /> MTUK verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"><ShieldAlert className="size-3.5" aria-hidden /> Not verified ({details.verification_status})</span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        <span className={cn("size-2 rounded-full", statusOf({ is_live: selectedLive, on_trip: Boolean(details.ride) }).dot)} aria-hidden />
                        {statusOf({ is_live: selectedLive, on_trip: Boolean(details.ride) }).label}
                      </span>
                    </div>
                  </div>
                </div>

                {details.ride ? (
                  <div className="rounded-lg border border-[#079BE5]/30 bg-[#079BE5]/5 p-3 text-sm">
                    <p className="text-xs font-semibold text-[#079BE5] uppercase">On a trip · {details.ride.status}</p>
                    <p className="mt-1 font-medium">{details.ride.pickup} → {details.ride.dropoff}</p>
                    {details.ride.passenger_name ? <p className="text-xs text-muted-foreground">Passenger: {details.ride.passenger_name}</p> : null}
                  </div>
                ) : null}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Mobile</dt><dd className="font-medium">{details.phone || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Vehicle model</dt><dd>{details.vehicle_model || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Licence number</dt><dd className="font-mono text-xs">{details.license_number || "—"}</dd></div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Licence valid till</dt>
                    <dd className={cn(licenceExpired && "font-semibold text-destructive")}>{formatDay(details.license_expiry)}{licenceExpired ? " (expired)" : ""}</dd>
                  </div>
                  <div><dt className="text-xs text-muted-foreground">City</dt><dd>{details.city || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Completed trips</dt><dd className="font-medium">{details.completed_trips ?? "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Speed</dt><dd>{selectedLive ? kmh(details.speed) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Partner since</dt><dd>{formatDay(details.joined_at)}</dd></div>
                  {details.email ? <div className="col-span-2"><dt className="text-xs text-muted-foreground">Email</dt><dd className="truncate">{details.email}</dd></div> : null}
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">{selectedLive ? "Location updated" : "Last seen"}</dt>
                    <dd className="inline-flex items-center gap-1"><Clock className="size-3.5 text-muted-foreground" aria-hidden />{timeAgo(details.updated_at, now)}</dd>
                  </div>
                  {details.lat !== null && details.lng !== null ? (
                    <div className="col-span-2"><dt className="text-xs text-muted-foreground">Coordinates</dt><dd className="font-mono text-xs">{details.lat.toFixed(5)}, {details.lng.toFixed(5)}</dd></div>
                  ) : null}
                </dl>

                {photos.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Photos & documents</p>
                    <PhotoGrid photos={photos} onOpen={setViewer} />
                  </div>
                ) : null}

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
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold hover:bg-muted"
                    >
                      <Navigation className="size-4" aria-hidden /> Directions
                    </a>
                  ) : null}
                </div>
                {isOfficer ? <p className="text-[11px] text-muted-foreground">This lookup is recorded in the MTUK audit log.</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="space-y-2 border-b p-3">
            <label htmlFor="traffic-search" className="sr-only">Search by vehicle number, name or mobile</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="traffic-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Vehicle number, name or mobile"
                className="h-10 pl-9 uppercase placeholder:normal-case"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Filter e-rickshaws">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
                    filter === item.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label} <span className="tabular-nums opacity-70">{loaded ? item.count : ""}</span>
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {!loaded
                ? "Loading…"
                : query
                  ? "No e-rickshaw matches this search."
                  : filter === "live"
                    ? "No e-rickshaw is online. Drivers appear here when they go online in the app."
                    : filter === "offline"
                      ? "Every registered e-rickshaw is online."
                      : "No service provider is registered yet."}
            </p>
          ) : (
            <ul className="max-h-[55dvh] divide-y overflow-y-auto">
              {filtered.map((driver) => {
                const status = statusOf(driver);
                return (
                  <li key={driver.provider_id}>
                    <button
                      type="button"
                      onClick={() => void openDriver(driver)}
                      aria-pressed={driver.provider_id === selectedId}
                      className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted", driver.provider_id === selectedId && "bg-accent")}
                    >
                      <span className={cn("size-2.5 shrink-0 rounded-full", status.dot)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-semibold">{driver.vehicle_number || "—"}</span>
                          {driver.verification_status !== "approved" ? (
                            <span className="rounded bg-destructive/10 px-1 text-[10px] font-semibold text-destructive uppercase">{driver.verification_status}</span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{driver.name}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted-foreground">
                        <span className="block font-medium text-foreground">{status.label}</span>
                        {hasPosition(driver) ? timeAgo(driver.updated_at, now) : "No location yet"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>

      {viewer ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewer.label}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setViewer(null)}
        >
          <div className="relative max-h-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.url} alt={viewer.label} className="max-h-[85dvh] w-auto rounded-lg object-contain" />
            <p className="mt-2 text-center text-sm font-medium text-white">{viewer.label}</p>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="absolute -top-3 -right-3 grid size-8 place-items-center rounded-full bg-white text-black shadow"
              aria-label="Close photo"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
