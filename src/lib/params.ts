// Parses URL search params into safe query inputs. Everything a page filters on lives
// in the URL so filters survive reloads and can be shared between admins.

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export const pageSize = 25;

export function readPage(params: SearchParams) {
  const page = Number.parseInt(param(params, "page"), 10);
  const current = Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
  const from = (current - 1) * pageSize;
  return { page: current, from, to: from + pageSize - 1 };
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

// PostgREST `or=` filters treat , ( ) as syntax and % * as wildcards, so strip them.
export function readSearch(params: SearchParams) {
  return param(params, "q").replace(/[,()%*\\"':]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function readEnum<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T | null {
  const value = param(params, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export type DateRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  label: string;
  bucket: "day" | "week" | "month";
  fromInput: string;
  toInput: string;
};

const istOffsetMs = 5.5 * 60 * 60 * 1000;

// Midnight in India for the calendar date that contains `date`.
function istMidnight(date: Date) {
  const shifted = new Date(date.getTime() + istOffsetMs);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - istOffsetMs);
}

function istDateInput(date: Date) {
  return new Date(date.getTime() + istOffsetMs).toISOString().slice(0, 10);
}

function parseIstDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const day = 24 * 60 * 60 * 1000;

export function readRange(params: SearchParams, fallback: RangeKey = "30d", now = new Date()): DateRange {
  const key = (readEnum(params, "range", ["today", "7d", "30d", "90d", "custom"] as const) ?? fallback) as RangeKey;
  const tomorrow = new Date(istMidnight(now).getTime() + day);

  if (key === "custom") {
    const start = parseIstDate(param(params, "from"));
    const end = parseIstDate(param(params, "to"));
    if (start && end && start <= end && end.getTime() - start.getTime() <= 366 * day) {
      const to = new Date(end.getTime() + day);
      return build("custom", start, to, `${istDateInput(start)} to ${istDateInput(end)}`);
    }
    return readRange({}, fallback, now);
  }

  const days = key === "today" ? 1 : key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const label = key === "today" ? "Today" : `Last ${days} days`;
  return build(key, new Date(tomorrow.getTime() - days * day), tomorrow, label);
}

function build(key: RangeKey, from: Date, to: Date, label: string): DateRange {
  const span = (to.getTime() - from.getTime()) / day;
  return {
    key,
    from,
    to,
    label,
    bucket: span > 120 ? "month" : span > 45 ? "week" : "day",
    fromInput: istDateInput(from),
    toInput: istDateInput(new Date(to.getTime() - day)),
  };
}

// Builds a URL that keeps current params but overrides some (and resets paging).
export function withParams(path: string, current: SearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) next.set(key, first);
  }
  if (!("page" in changes)) next.delete("page");
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}
