import "server-only";
import { createClient } from "@/lib/supabase/server";
import { describeError } from "@/lib/errors";
import { isUuid, pageSize, type DateRange } from "@/lib/params";
import {
  activeRideStatuses,
  partnerColumns,
  passengerColumns,
  providerColumns,
  rideColumns,
  type AuditEntry,
  type ContactMessage,
  type Overview,
  type PartnerApplication,
  type PartnerStatus,
  type Passenger,
  type Provider,
  type Ride,
  type RideCounts,
  type RideStatus,
  type SignupPoint,
  type TrendPoint,
  type VerificationStatus,
} from "@/lib/types";

// Every function here assumes requireAdmin() already ran for the request. RLS enforces
// the same rule again in the database, so a missed check returns no rows, not data.

export type Result<T> = { data: T; error: string | null };
export type Paged<T> = { rows: T[]; total: number; error: string | null };

function paged<T>(rows: T[] | null, count: number | null, error: Parameters<typeof describeError>[0]): Paged<T> {
  return { rows: rows ?? [], total: count ?? 0, error: error ? describeError(error) : null };
}

type Sort = { column: string; ascending: boolean };

// ---- Customers ---------------------------------------------------------------------------

export const customerSorts: Record<string, Sort> = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  name: { column: "name", ascending: true },
};

export async function listCustomers(input: { q: string; from: number; to: number; sort: string; range: DateRange | null }) {
  const supabase = await createClient();
  const sort = customerSorts[input.sort] ?? customerSorts.newest;
  let query = supabase.from("passengers").select(passengerColumns, { count: "exact" });
  if (input.q) {
    query = isUuid(input.q)
      ? query.eq("id", input.q)
      : query.or(`name.ilike.%${input.q}%,email.ilike.%${input.q}%,phone.ilike.%${input.q}%`);
  }
  if (input.range) query = query.gte("created_at", input.range.from.toISOString()).lt("created_at", input.range.to.toISOString());
  const { data, count, error } = await query.order(sort.column, { ascending: sort.ascending }).range(input.from, input.to);
  return paged(data as Passenger[] | null, count, error);
}

export async function getCustomer(id: string): Promise<Result<Passenger | null>> {
  if (!isUuid(id)) return { data: null, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("passengers").select(passengerColumns).eq("id", id).maybeSingle();
  return { data: data as Passenger | null, error: error ? describeError(error) : null };
}

// ---- Drivers -----------------------------------------------------------------------------

export const driverSorts: Record<string, Sort> = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  name: { column: "name", ascending: true },
};

export async function listDrivers(input: {
  q: string;
  status: VerificationStatus | null;
  from: number;
  to: number;
  sort: string;
}) {
  const supabase = await createClient();
  const sort = driverSorts[input.sort] ?? driverSorts.newest;
  let query = supabase.from("providers").select(providerColumns, { count: "exact" });
  if (input.status) query = query.eq("verification_status", input.status);
  if (input.q) {
    query = isUuid(input.q)
      ? query.eq("id", input.q)
      : query.or(
          `name.ilike.%${input.q}%,email.ilike.%${input.q}%,phone.ilike.%${input.q}%,vehicle_number.ilike.%${input.q}%`,
        );
  }
  const { data, count, error } = await query.order(sort.column, { ascending: sort.ascending }).range(input.from, input.to);
  return paged(data as Provider[] | null, count, error);
}

export async function driverStatusCounts(): Promise<Record<VerificationStatus | "all", number | null>> {
  const supabase = await createClient();
  const count = async (status?: VerificationStatus) => {
    let query = supabase.from("providers").select("id", { count: "exact", head: true });
    if (status) query = query.eq("verification_status", status);
    const { count: n, error } = await query;
    return error ? null : n;
  };
  const [all, pending, approved, rejected, suspended] = await Promise.all([
    count(),
    count("pending"),
    count("approved"),
    count("rejected"),
    count("suspended"),
  ]);
  return { all, pending, approved, rejected, suspended };
}

export async function getDriver(id: string): Promise<Result<Provider | null>> {
  if (!isUuid(id)) return { data: null, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("providers").select(providerColumns).eq("id", id).maybeSingle();
  return { data: data as Provider | null, error: error ? describeError(error) : null };
}

export async function rideCounts(ids: string[], role: "passenger" | "driver"): Promise<Map<string, RideCounts>> {
  const map = new Map<string, RideCounts>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ride_counts", { p_user_ids: ids, p_role: role });
  if (error) {
    describeError(error);
    return map;
  }
  for (const row of (data ?? []) as RideCounts[]) {
    map.set(row.user_id, { ...row, total: Number(row.total), completed: Number(row.completed), cancelled: Number(row.cancelled) });
  }
  return map;
}

// ---- Rides -------------------------------------------------------------------------------

export async function listRides(input: {
  q: string;
  status: RideStatus | null;
  range: DateRange | null;
  from: number;
  to: number;
  passengerId?: string;
  driverId?: string;
  ascending?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase.from("rides").select(rideColumns, { count: "exact" });
  if (input.status) query = query.eq("status", input.status);
  if (input.passengerId) query = query.eq("passenger_id", input.passengerId);
  if (input.driverId) query = query.eq("driver_id", input.driverId);
  if (input.range) query = query.gte("created_at", input.range.from.toISOString()).lt("created_at", input.range.to.toISOString());
  if (input.q) {
    query = isUuid(input.q)
      ? query.or(`id.eq.${input.q},passenger_id.eq.${input.q},driver_id.eq.${input.q}`)
      : query.or(
          `passenger_name.ilike.%${input.q}%,driver_name.ilike.%${input.q}%,pickup.ilike.%${input.q}%,dropoff.ilike.%${input.q}%,vehicle_number.ilike.%${input.q}%`,
        );
  }
  const { data, count, error } = await query
    .order("created_at", { ascending: input.ascending ?? false })
    .range(input.from, input.to);
  return paged(data as Ride[] | null, count, error);
}

export async function getRide(id: string): Promise<Result<Ride | null>> {
  if (!isUuid(id)) return { data: null, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("rides").select(rideColumns).eq("id", id).maybeSingle();
  return { data: data as Ride | null, error: error ? describeError(error) : null };
}

// Capped: the live map shows what is happening now, not history.
export async function listActiveRides(): Promise<Result<Ride[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rides")
    .select(rideColumns)
    .in("status", activeRideStatuses)
    .order("created_at", { ascending: false })
    .limit(200);
  return { data: (data ?? []) as Ride[], error: error ? describeError(error) : null };
}

// ---- Stats -------------------------------------------------------------------------------

export async function getOverview(range: DateRange): Promise<Result<Overview | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });
  return { data: (data as Overview | null) ?? null, error: error ? describeError(error) : null };
}

export async function getRideTrend(range: DateRange): Promise<Result<TrendPoint[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ride_trend", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_bucket: range.bucket,
  });
  const rows = ((data ?? []) as TrendPoint[]).map((row) => ({
    bucket: row.bucket,
    total: Number(row.total),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
  }));
  return { data: rows, error: error ? describeError(error) : null };
}

export async function getSignupTrend(range: DateRange): Promise<Result<SignupPoint[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_signup_trend", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_bucket: range.bucket,
  });
  const rows = ((data ?? []) as SignupPoint[]).map((row) => ({
    bucket: row.bucket,
    customers: Number(row.customers),
    drivers: Number(row.drivers),
  }));
  return { data: rows, error: error ? describeError(error) : null };
}

export async function getCancellationBreakdown(range: DateRange): Promise<Result<{ stage: string; rides: number }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_cancellation_breakdown", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });
  const rows = ((data ?? []) as { stage: string; rides: number }[]).map((row) => ({ stage: row.stage, rides: Number(row.rides) }));
  return { data: rows, error: error ? describeError(error) : null };
}

export async function recentCustomers(limit = 5): Promise<Result<Passenger[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("passengers").select(passengerColumns).order("created_at", { ascending: false }).limit(limit);
  return { data: (data ?? []) as Passenger[], error: error ? describeError(error) : null };
}

export async function recentDrivers(limit = 5): Promise<Result<Provider[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("providers").select(providerColumns).order("created_at", { ascending: false }).limit(limit);
  return { data: (data ?? []) as Provider[], error: error ? describeError(error) : null };
}

// ---- Audit log ---------------------------------------------------------------------------

export const auditActions = ["driver.status_changed", "ride.cancelled"] as const;

export async function listAudit(input: {
  from: number;
  to: number;
  action?: string | null;
  targetType?: string;
  targetId?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("admin_audit_log").select("*", { count: "exact" });
  if (input.action) query = query.eq("action", input.action);
  if (input.targetType) query = query.eq("target_type", input.targetType);
  if (input.targetId) query = query.eq("target_id", input.targetId);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(input.from, input.to);
  return paged(data as AuditEntry[] | null, count, error);
}

export { pageSize };

// ---- Partner applications ---------------------------------------------------------------

export async function listPartners(input: {
  q: string;
  status: PartnerStatus | null;
  from: number;
  to: number;
}) {
  const supabase = await createClient();
  let query = supabase.from("partner_applications").select(partnerColumns, { count: "exact" });
  if (input.status) query = query.eq("status", input.status);
  if (input.q) {
    query = isUuid(input.q)
      ? query.eq("id", input.q)
      : query.or(
          `name.ilike.%${input.q}%,email.ilike.%${input.q}%,phone.ilike.%${input.q}%,vehicle_number.ilike.%${input.q}%,city.ilike.%${input.q}%`,
        );
  }
  const { data, count, error } = await query.order("created_at", { ascending: input.status === "pending" }).range(input.from, input.to);
  return paged(data as PartnerApplication[] | null, count, error);
}

export async function partnerStatusCounts(): Promise<Record<PartnerStatus | "all", number | null>> {
  const supabase = await createClient();
  const count = async (status?: PartnerStatus) => {
    let query = supabase.from("partner_applications").select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    const { count: n, error } = await query;
    return error ? null : n;
  };
  const [all, pending, approved, rejected] = await Promise.all([count(), count("pending"), count("approved"), count("rejected")]);
  return { all, pending, approved, rejected };
}

export async function getPartner(id: string): Promise<Result<PartnerApplication | null>> {
  if (!isUuid(id)) return { data: null, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("partner_applications").select(partnerColumns).eq("id", id).maybeSingle();
  return { data: data as PartnerApplication | null, error: error ? describeError(error) : null };
}

export async function getPartnerForDriver(driver: { id: string; email: string; phone: string }): Promise<Result<PartnerApplication | null>> {
  const supabase = await createClient();
  const parts = [`user_id.eq.${driver.id}`];
  if (driver.email) parts.push(`email.eq.${driver.email.replace(/[,()]/g, "")}`);
  if (driver.phone) parts.push(`phone.eq.${driver.phone.replace(/[,()]/g, "")}`);
  const { data, error } = await supabase
    .from("partner_applications")
    .select(partnerColumns)
    .or(parts.join(","))
    .order("created_at", { ascending: false })
    .limit(1);
  return { data: (data?.[0] as PartnerApplication | undefined) ?? null, error: error ? describeError(error) : null };
}

export async function signedDocumentUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("partner-documents").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listMessages(input: { from: number; to: number }) {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(input.from, input.to);
  return paged(data as ContactMessage[] | null, count, error);
}
