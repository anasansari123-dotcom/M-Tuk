"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAdmin } from "@/lib/auth";
import { describeError } from "@/lib/errors";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
