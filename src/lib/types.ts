// Row types taken from backend/sql/*.sql. Keep in sync with those files.

export type RideStatus = "requested" | "accepted" | "arriving" | "ongoing" | "completed" | "cancelled";

export const rideStatuses: RideStatus[] = ["requested", "accepted", "arriving", "ongoing", "completed", "cancelled"];
export const activeRideStatuses: RideStatus[] = ["requested", "accepted", "arriving", "ongoing"];
export const adminCancellableStatuses: RideStatus[] = ["requested", "accepted", "arriving"];

export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
export const verificationStatuses: VerificationStatus[] = ["pending", "approved", "rejected", "suspended"];

export type Passenger = {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type Provider = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle_number: string;
  vehicle_model: string;
  created_at: string;
  updated_at: string;
  verification_status: VerificationStatus;
  verification_note: string;
  verification_updated_at: string | null;
  verification_updated_by: string | null;
};

// The OTP column is deliberately never selected by the admin app.
export type Ride = {
  id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_phone: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  pickup: string;
  pickup_area: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  drop_area: string;
  drop_lat: number;
  drop_lng: number;
  fare: number;
  distance_km: number;
  minutes: number;
  status: RideStatus;
  created_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
};

export const rideColumns =
  "id, passenger_id, passenger_name, passenger_phone, driver_id, driver_name, driver_phone, vehicle_number, vehicle_model, pickup, pickup_area, pickup_lat, pickup_lng, dropoff, drop_area, drop_lat, drop_lng, fare, distance_km, minutes, status, created_at, accepted_at, arrived_at, started_at, completed_at, cancelled_at, updated_at";

export const passengerColumns = "id, name, phone, email, created_at, updated_at";

export const providerColumns =
  "id, name, phone, email, vehicle_number, vehicle_model, created_at, updated_at, verification_status, verification_note, verification_updated_at, verification_updated_by";

export type PartnerStatus = "pending" | "approved" | "rejected";
export const partnerStatuses: PartnerStatus[] = ["pending", "approved", "rejected"];

export type PartnerApplication = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  city: string;
  vehicle_number: string;
  vehicle_model: string;
  license_number: string;
  message: string;
  license_path: string;
  rc_path: string;
  photo_path: string;
  id_path: string;
  status: PartnerStatus;
  note: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export const partnerColumns =
  "id, user_id, name, phone, email, city, vehicle_number, vehicle_model, license_number, message, license_path, rc_path, photo_path, id_path, status, note, created_at, reviewed_at, reviewed_by";

export type AdminAccount = {
  user_id: string;
  email: string;
  note: string;
  created_at: string;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  admin_id: string | null;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type RideCounts = { user_id: string; total: number; completed: number; cancelled: number };

export type Overview = {
  customers_total: number;
  customers_new: number;
  drivers_total: number;
  drivers_new: number;
  drivers_pending: number;
  drivers_approved: number;
  drivers_rejected: number;
  drivers_suspended: number;
  rides_all_time: number;
  live_requested: number;
  live_accepted: number;
  live_arriving: number;
  live_ongoing: number;
  range: {
    total: number;
    requested: number;
    accepted: number;
    arriving: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    completed_quoted_fare: number;
    completed_distance_km: number;
    avg_quoted_fare: number;
    avg_distance_km: number;
  };
};

export type TrendPoint = { bucket: string; total: number; completed: number; cancelled: number };
export type SignupPoint = { bucket: string; customers: number; drivers: number };
