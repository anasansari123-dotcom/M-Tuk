"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAdmin } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { supabaseConfigured } from "@/lib/env";
import { createClient, createServiceClient, findAuthUserByEmail, serviceRoleConfigured } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
  next: z.string().max(200).optional(),
});

function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") && value !== "/login" ? value : "/dashboard";
}

export async function signIn(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!supabaseConfigured) return { ok: false, message: "The admin site is not configured. Set the Supabase environment variables." };
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // The cause goes to the server log only; the browser gets one message for both cases.
    console.warn("Admin sign-in failed", { status: error.status, code: error.code });
    // Same message for unknown email and wrong password.
    return { ok: false, message: error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Email or password is incorrect." };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || isAdmin !== true) {
    console.warn("Admin sign-in refused", roleError ? { code: roleError.code } : { reason: "not in admin_users" });
    await supabase.auth.signOut();
    return {
      ok: false,
      message: roleError
        ? "Admin access is not set up yet. Run supabase/admin.sql in Supabase."
        : "This account does not have admin access.",
    };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const driverStatusSchema = z
  .object({
    driverId: z.uuid(),
    status: z.enum(["pending", "approved", "rejected", "suspended"]),
    note: z.string().trim().max(500),
  })
  .refine((value) => !["rejected", "suspended"].includes(value.status) || value.note.length > 0, {
    message: "Give a reason for this change.",
  });

export async function setDriverStatus(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  const parsed = driverStatusSchema.safeParse({
    driverId: formData.get("driverId"),
    status: formData.get("status"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_driver_status", {
    p_driver_id: parsed.data.driverId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) return { ok: false, message: describeError(error, "Could not update the driver.") };

  revalidatePath(`/drivers/${parsed.data.driverId}`);
  revalidatePath("/drivers");
  return { ok: true, message: `Driver marked ${parsed.data.status}.` };
}

const cancelSchema = z.object({
  rideId: z.uuid(),
  reason: z.string().trim().min(1, "Give a reason for cancelling.").max(500),
});

export async function cancelRide(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  const parsed = cancelSchema.safeParse({ rideId: formData.get("rideId"), reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_ride", { p_ride_id: parsed.data.rideId, p_reason: parsed.data.reason });
  if (error) return { ok: false, message: describeError(error, "Could not cancel the ride.") };

  revalidatePath(`/rides/${parsed.data.rideId}`);
  revalidatePath("/rides");
  return { ok: true, message: "Ride cancelled. The passenger and driver apps update automatically." };
}

const partnerReviewSchema = z
  .object({
    applicationId: z.uuid(),
    status: z.enum(["pending", "approved", "rejected"]),
    note: z.string().trim().max(500),
  })
  .refine((value) => value.status !== "rejected" || value.note.length > 0, {
    message: "Give a reason for rejecting this application.",
  });

export async function reviewPartnerApplication(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  const parsed = partnerReviewSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_partner_application", {
    p_application_id: parsed.data.applicationId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) return { ok: false, message: describeError(error, "Could not update the application.") };

  revalidatePath(`/partners/${parsed.data.applicationId}`);
  revalidatePath("/partners");
  revalidatePath("/drivers");
  return { ok: true, message: `Application marked ${parsed.data.status}.` };
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function needsServiceRole() {
  return {
    ok: false,
    message:
      "SUPABASE_SERVICE_ROLE_KEY is missing. Local: paste the service_role key into .env.local and restart npm run dev. Vercel: add that exact name (no NEXT_PUBLIC_), then Redeploy.",
  };
}

const createAdminSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(12, "Use at least 12 characters.").max(200),
  note: z.string().trim().max(200).optional(),
});

export async function createAdminAccount(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  if (!serviceRoleConfigured()) return needsServiceRole();
  const parsed = createAdminSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  if (parsed.data.email === admin.email.toLowerCase()) {
    return { ok: false, message: "You already have admin access." };
  }

  const service = createServiceClient();
  if (!service) return needsServiceRole();

  let user = await findAuthUserByEmail(parsed.data.email);
  if (user) {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, role: "admin" },
    });
    if (error) return { ok: false, message: "Could not update that login. Try a different email." };
  } else {
    const created = await service.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (created.error || !created.data.user) {
      return { ok: false, message: created.error?.message?.includes("already") ? "That email is already registered." : "Could not create the login." };
    }
    user = created.data.user;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_admin", {
    p_user_id: user.id,
    p_note: parsed.data.note ?? "",
  });
  if (error) return { ok: false, message: describeError(error, "Login was created but admin access was not granted.") };

  revalidatePath("/admins");
  return { ok: true, message: `${parsed.data.email} can now sign in at /login.` };
}

export async function revokeAdminAccess(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  const parsed = z.object({ userId: z.uuid() }).safeParse({ userId: String(formData.get("userId") ?? "") });
  if (!parsed.success) return { ok: false, message: "Choose an admin." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_admin", { p_user_id: parsed.data.userId });
  if (error) return { ok: false, message: describeError(error, "Could not remove admin access.") };

  revalidatePath("/admins");
  return { ok: true, message: "Admin access removed. They can no longer open the desk." };
}

const createProviderSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name.").max(80),
  phone: z
    .string()
    .transform(phoneDigits)
    .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number."),
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(6, "Use at least 6 characters for the app password.").max(200),
  vehicleNumber: z.string().trim().min(4, "Enter the vehicle registration number.").max(20),
  vehicleModel: z.string().trim().min(2, "Enter the vehicle model.").max(80),
  approveNow: z.boolean(),
});

export async function createProviderAccount(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await checkAdmin();
  if (!admin) return { ok: false, message: "Your session has ended or you are not an admin. Sign in again." };
  if (!serviceRoleConfigured()) return needsServiceRole();
  const parsed = createProviderSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    vehicleNumber: String(formData.get("vehicleNumber") ?? ""),
    vehicleModel: String(formData.get("vehicleModel") ?? ""),
    approveNow: String(formData.get("approveNow") ?? "") === "1",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const service = createServiceClient();
  if (!service) return needsServiceRole();

  const metadata = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    role: "driver",
    vehicle_number: parsed.data.vehicleNumber.toUpperCase(),
    vehicle_model: parsed.data.vehicleModel,
  };

  let user = await findAuthUserByEmail(parsed.data.email);
  if (user) {
    const role = user.user_metadata?.role;
    if (role === "passenger") {
      return { ok: false, message: "This email is already a passenger account. Use a different email." };
    }
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, ...metadata },
    });
    if (error) return { ok: false, message: "That email already has a login, and it could not be updated." };
  } else {
    const created = await service.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (created.error || !created.data.user) {
      return { ok: false, message: created.error?.message?.includes("already") ? "That email is already registered." : "Could not create the login." };
    }
    user = created.data.user;
  }

  const { error: profileError } = await service.from("providers").upsert(
    {
      id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      vehicle_number: parsed.data.vehicleNumber.toUpperCase(),
      vehicle_model: parsed.data.vehicleModel,
    },
    { onConflict: "id" },
  );
  if (profileError) return { ok: false, message: describeError(profileError, "Login was created but the provider profile was not saved.") };

  if (parsed.data.approveNow) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_driver_status", {
      p_driver_id: user.id,
      p_status: "approved",
      p_note: "Created and verified from the admin desk",
    });
    if (error && !error.message?.includes("already")) {
      revalidatePath("/drivers");
      revalidatePath(`/drivers/${user.id}`);
      return { ok: false, message: "Provider saved, but verification failed. Open the driver page and approve them." };
    }
  }

  revalidatePath("/drivers");
  revalidatePath(`/drivers/${user.id}`);
  redirect(`/drivers/${user.id}`);
}
