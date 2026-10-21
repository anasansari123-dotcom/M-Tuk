"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { describeError } from "@/lib/errors";
import { supabaseConfigured } from "@/lib/env";
import { createAnonClient } from "@/lib/supabase/server";

export type PublicState = { ok: boolean; message: string } | null;

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const partnerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z
    .string()
    .transform(phoneDigits)
    .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number."),
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(6, "Use at least 6 characters for your app password.").max(200),
  city: z.string().trim().min(2, "Enter the city or nagar you drive in.").max(80),
  vehicleNumber: z.string().trim().min(4, "Enter the vehicle registration number.").max(20),
  vehicleModel: z.string().trim().min(2, "Enter the vehicle model.").max(80),
  licenseNumber: z.string().trim().min(4, "Enter your driving licence number.").max(40),
  message: z.string().trim().max(500).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "Write a short message so we know how to help.").max(2000),
});

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

function extensionFor(file: File, imagesOnly = false) {
  if (!imagesOnly && file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function readFile(formData: FormData, key: string, label: string, imagesOnly = false): { ok: true; file: File } | { ok: false; error: string } {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: `Upload your ${label}.` };
  if (value.size > maxBytes) return { ok: false, error: `${label} must be under 5 MB.` };
  const allowed = imagesOnly ? photoTypes : allowedTypes;
  if (!allowed.has(value.type)) {
    return { ok: false, error: `${label} must be a JPG, PNG${imagesOnly ? "" : ", WebP or PDF"}.` };
  }
  return { ok: true, file: value };
}

export async function submitPartnerApplication(_state: PublicState, formData: FormData): Promise<PublicState> {
  if (!supabaseConfigured) return { ok: false, message: "Applications are not open yet. Try again later." };

  const parsed = partnerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    city: String(formData.get("city") ?? ""),
    vehicleNumber: String(formData.get("vehicleNumber") ?? ""),
    vehicleModel: String(formData.get("vehicleModel") ?? ""),
    licenseNumber: String(formData.get("licenseNumber") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const license = readFile(formData, "license", "driving licence");
  const rc = readFile(formData, "rc", "vehicle RC");
  const photo = readFile(formData, "photo", "vehicle photo", true);
  const idDoc = readFile(formData, "idDoc", "Aadhaar or government ID");
  if (!license.ok) return { ok: false, message: license.error };
  if (!rc.ok) return { ok: false, message: rc.error };
  if (!photo.ok) return { ok: false, message: photo.error };
  if (!idDoc.ok) return { ok: false, message: idDoc.error };

  const supabase = createAnonClient();
  const { data: applicationId, error: insertError } = await supabase.rpc("submit_partner_application", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    p_city: parsed.data.city,
    p_vehicle_number: parsed.data.vehicleNumber.toUpperCase(),
    p_vehicle_model: parsed.data.vehicleModel,
    p_license_number: parsed.data.licenseNumber.toUpperCase(),
    p_message: parsed.data.message ?? "",
  });
  if (insertError || !applicationId) {
    return { ok: false, message: describeError(insertError, "Could not submit the application.") };
  }

  const id = String(applicationId);
  const uploads: { path: string; file: File }[] = [
    { path: `${id}/license.${extensionFor(license.file)}`, file: license.file },
    { path: `${id}/rc.${extensionFor(rc.file)}`, file: rc.file },
    { path: `${id}/photo.${extensionFor(photo.file, true)}`, file: photo.file },
    { path: `${id}/id.${extensionFor(idDoc.file)}`, file: idDoc.file },
  ];

  for (const item of uploads) {
    const { error } = await supabase.storage.from("partner-documents").upload(item.path, item.file, {
      contentType: item.file.type,
      upsert: false,
    });
    if (error) {
      console.error("Partner document upload failed", error.message);
      return {
        ok: false,
        message: "Your details were saved, but a document did not upload. Email us or try again from a new address.",
      };
    }
  }

  const { error: attachError } = await supabase.rpc("attach_partner_documents", {
    p_id: id,
    p_license_path: uploads[0].path,
    p_rc_path: uploads[1].path,
    p_photo_path: uploads[2].path,
    p_id_path: uploads[3].path,
  });
  if (attachError) return { ok: false, message: describeError(attachError, "Could not attach your documents.") };

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        role: "driver",
        vehicle_number: parsed.data.vehicleNumber.toUpperCase(),
        vehicle_model: parsed.data.vehicleModel,
      },
    },
  });

  if (signUpError) {
    console.warn("Partner app account was not created", signUpError.code);
  } else if (signUpData.session && signUpData.user) {
    await supabase.from("providers").upsert(
      {
        id: signUpData.user.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        vehicle_number: parsed.data.vehicleNumber.toUpperCase(),
        vehicle_model: parsed.data.vehicleModel,
      },
      { onConflict: "id" },
    );
  }

  redirect("/partner/thanks");
}

export async function submitContact(_state: PublicState, formData: FormData): Promise<PublicState> {
  if (!supabaseConfigured) return { ok: false, message: "Messages are not open yet. Email us instead." };
  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = createAnonClient();
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone ?? "",
    p_subject: parsed.data.subject ?? "",
    p_message: parsed.data.message,
  });
  if (error) return { ok: false, message: describeError(error, "Could not send the message.") };
  return { ok: true, message: "Message sent. We will get back to you on this email." };
}
