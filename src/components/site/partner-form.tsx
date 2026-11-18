"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelfieCapture } from "@/components/site/selfie-capture";
import { submitPartnerApplication } from "@/lib/public-actions";

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-[#042D58]">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-[#71869A]">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({ step, eyebrow, title, body, color }: { step: string; eyebrow: string; title: string; body?: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: color }}>
        {step}
      </span>
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color }}>
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-xl font-extrabold text-[#042D58]">{title}</h2>
        {body ? <p className="mt-1 text-sm text-[#71869A]">{body}</p> : null}
      </div>
    </div>
  );
}

const fileClass =
  "h-auto min-h-12 w-full cursor-pointer py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#E7F8EE] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#00A84F]";
const docTypes = "image/jpeg,image/png,image/webp,application/pdf";
const imageTypes = "image/jpeg,image/png,image/webp";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function PartnerForm() {
  const [state, action, pending] = useActionState(submitPartnerApplication, null);
  const [clientError, setClientError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  const now = new Date();
  const adultBy = new Date(now);
  adultBy.setFullYear(now.getFullYear() - 18);

  const message = clientError || (state && !state.ok ? state.message : "");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Submit manually so React does not reset the form: on a server error the applicant
    // keeps every typed field and chosen file instead of uploading seven documents again.
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selfie = formData.get("selfie");
    if (!(selfie instanceof File) || selfie.size === 0) {
      setClientError("Take a live photo with your camera before submitting.");
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setClientError("");
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {message ? (
        <p ref={errorRef} role="alert" className="rounded-2xl bg-[#FDEBED] px-4 py-3 text-sm text-[#EF2435]">
          {message}
        </p>
      ) : null}

      <section className="space-y-5">
        <SectionTitle step="1" eyebrow="Personal details" title="Who you are" color="#00A84F" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name (as on Aadhaar)">
            <Input id="name" name="name" required autoComplete="name" className="h-11" placeholder="Ravi Kumar" />
          </Field>
          <Field id="dob" label="Date of birth" hint="You must be 18 or older.">
            <Input id="dob" name="dob" type="date" required max={isoDate(adultBy)} min="1940-01-01" className="h-11" />
          </Field>
          <Field id="phone" label="Mobile number" hint="Trip alerts and calls from the desk use this number.">
            <Input id="phone" name="phone" required inputMode="numeric" autoComplete="tel" className="h-11" placeholder="98765 43210" />
          </Field>
          <Field id="email" label="Email">
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" placeholder="you@email.com" />
          </Field>
          <Field id="address" label="Full address" className="sm:col-span-2">
            <Textarea id="address" name="address" required minLength={10} maxLength={300} rows={2} autoComplete="street-address" placeholder="House no., street, area, landmark" />
          </Field>
          <Field id="city" label="City / nagar">
            <Input id="city" name="city" required className="h-11" placeholder="Which nagar do you drive in?" />
          </Field>
          <Field id="pincode" label="Pincode">
            <Input id="pincode" name="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" className="h-11" placeholder="110001" />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step="2" eyebrow="App login" title="Your MTUK Nagar Ride password" body="After approval, sign in to the app with this email and password." color="#079BE5" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="password" label="Create app password" hint="At least 6 characters.">
            <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={6} className="h-11" />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step="3" eyebrow="Identity" title="Aadhaar and PAN" body="Clear photo or PDF of each side, all four corners visible. JPG, PNG, WebP or PDF under 5 MB." color="#063F78" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="aadhaarNumber" label="Aadhaar number" hint="Only the last 4 digits are stored.">
            <Input id="aadhaarNumber" name="aadhaarNumber" required inputMode="numeric" autoComplete="off" maxLength={14} className="h-11 tracking-widest" placeholder="1234 5678 9012" />
          </Field>
          <Field id="panNumber" label="PAN number">
            <Input id="panNumber" name="panNumber" required autoComplete="off" maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" className="h-11 uppercase tracking-widest" placeholder="ABCDE1234F" />
          </Field>
          <Field id="idDoc" label="Aadhaar card – front">
            <Input id="idDoc" name="idDoc" type="file" required accept={docTypes} className={fileClass} />
          </Field>
          <Field id="aadhaarBack" label="Aadhaar card – back">
            <Input id="aadhaarBack" name="aadhaarBack" type="file" required accept={docTypes} className={fileClass} />
          </Field>
          <Field id="pan" label="PAN card">
            <Input id="pan" name="pan" type="file" required accept={docTypes} className={fileClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step="4" eyebrow="Licence and vehicle" title="Driving licence and e-rickshaw" color="#FFAA00" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="licenseNumber" label="Driving licence number">
            <Input id="licenseNumber" name="licenseNumber" required className="h-11 uppercase" placeholder="UP14 20190012345" />
          </Field>
          <Field id="licenseExpiry" label="Licence valid till">
            <Input id="licenseExpiry" name="licenseExpiry" type="date" required min={isoDate(now)} className="h-11" />
          </Field>
          <Field id="vehicleNumber" label="Vehicle registration number">
            <Input id="vehicleNumber" name="vehicleNumber" required className="h-11 uppercase" placeholder="UP14 ER 4821" />
          </Field>
          <Field id="vehicleModel" label="Vehicle model">
            <Input id="vehicleModel" name="vehicleModel" required className="h-11" placeholder="Piaggio Ape E-City" defaultValue="E-Rickshaw" />
          </Field>
          <Field id="license" label="Driving licence (photo or PDF)">
            <Input id="license" name="license" type="file" required accept={docTypes} className={fileClass} />
          </Field>
          <Field id="rc" label="Vehicle RC">
            <Input id="rc" name="rc" type="file" required accept={docTypes} className={fileClass} />
          </Field>
          <Field id="photo" label="Vehicle photo" hint="Full e-rickshaw with the number plate visible.">
            <Input id="photo" name="photo" type="file" required accept={imageTypes} className={fileClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle step="5" eyebrow="Live photo" title="Take a selfie now" body="The admin matches this photo with your Aadhaar and licence. Gallery photos are not accepted." color="#00A84F" />
        <SelfieCapture />
      </section>

      <section className="space-y-5">
        <Field id="message" label="Anything we should know? (optional)">
          <Textarea id="message" name="message" rows={3} maxLength={500} className="min-h-20" placeholder="Shift timing, another vehicle, or a preferred stand." />
        </Field>
        <label htmlFor="consent" className="flex items-start gap-3 rounded-2xl bg-[#F3F7FA] p-4 text-sm text-[#42566A]">
          <input id="consent" name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[#00A84F]" />
          <span>
            I confirm that the details and documents are mine and genuine. I agree that MTUK Nagar Ride may verify them for onboarding. False documents lead to permanent rejection.
          </span>
        </label>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-[#00A84F] text-base font-semibold hover:bg-[#059669] sm:w-auto sm:px-8">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? "Uploading documents…" : "Submit for verification"}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-[#71869A]">
          <Lock className="size-3.5" aria-hidden /> Documents are stored privately and seen only by MTUK admins.
        </p>
      </div>
    </form>
  );
}
