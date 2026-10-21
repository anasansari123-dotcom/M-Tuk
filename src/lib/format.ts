import type { PartnerStatus, RideStatus, VerificationStatus } from "@/lib/types";

const timeZone = "Asia/Kolkata";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone }).format(new Date(value));
}

export function formatRupees(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(Number(value));
}

export function formatKm(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(1)} km`;
}

export function timeAgo(value: string | null | undefined, now = Date.now()) {
  if (!value) return "—";
  const seconds = Math.round((now - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(value);
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

// Labels match what passengers and drivers see in the mobile app (src/data.ts).
export const rideStatusLabel: Record<RideStatus, string> = {
  requested: "Searching for driver",
  accepted: "Driver on the way",
  arriving: "Driver at pickup",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const verificationLabel: Record<VerificationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const partnerLabel: Record<PartnerStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};
