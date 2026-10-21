"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPartnerApplication } from "@/lib/public-actions";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#042D58]">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-[#71869A]">{hint}</p> : null}
    </div>
  );
}

const fileClass =
  "h-11 cursor-pointer text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#E7F8EE] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#00A84F]";

export function PartnerForm() {
  const [state, action, pending] = useActionState(submitPartnerApplication, null);

  return (
    <form action={action} className="space-y-8">
      {state && !state.ok ? (
        <p role="alert" className="rounded-2xl bg-[#FDEBED] px-4 py-3 text-sm text-[#EF2435]">
          {state.message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#00A84F] uppercase">Your details</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#042D58]">How we reach you</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name">
            <Input id="name" name="name" required autoComplete="name" className="h-11" placeholder="Ravi Kumar" />
          </Field>
          <Field id="phone" label="Mobile number" hint="OTP and trip alerts use this number.">
            <Input id="phone" name="phone" required inputMode="numeric" autoComplete="tel" className="h-11" placeholder="98765 43210" />
          </Field>
          <Field id="email" label="Email">
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" placeholder="you@email.com" />
          </Field>
          <Field id="password" label="App password" hint="Use this email and password to sign in to the MTUK Nagar Ride app after verification.">
            <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={6} className="h-11" />
          </Field>
          <Field id="city" label="City / nagar">
            <Input id="city" name="city" required className="h-11" placeholder="Which nagar do you drive in?" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#FFAA00] uppercase">Vehicle</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#042D58]">E-rickshaw you will take online</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="vehicleNumber" label="Registration number">
            <Input id="vehicleNumber" name="vehicleNumber" required className="h-11 uppercase" placeholder="DL 1E 4821" />
          </Field>
          <Field id="vehicleModel" label="Model">
            <Input id="vehicleModel" name="vehicleModel" required className="h-11" placeholder="Piaggio Ape E-City" defaultValue="E-Rickshaw" />
          </Field>
          <Field id="licenseNumber" label="Driving licence number">
            <Input id="licenseNumber" name="licenseNumber" required className="h-11 uppercase" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#079BE5] uppercase">Documents</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#042D58]">Admin reviews these before you can pick up</h2>
          <p className="mt-1 text-sm text-[#71869A]">JPG, PNG or PDF, under 5 MB each. Vehicle photo should be a clear picture of the e-rickshaw.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="license" label="Driving licence">
            <Input id="license" name="license" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
          </Field>
          <Field id="rc" label="Vehicle RC">
            <Input id="rc" name="rc" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
          </Field>
          <Field id="photo" label="Vehicle photo">
            <Input id="photo" name="photo" type="file" required accept="image/jpeg,image/png,image/webp" className={fileClass} />
          </Field>
          <Field id="idDoc" label="Aadhaar or government ID">
            <Input id="idDoc" name="idDoc" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
          </Field>
        </div>
        <Field id="message" label="Anything we should know? (optional)">
          <Textarea id="message" name="message" rows={4} maxLength={500} className="min-h-24" placeholder="Shift timing, another vehicle, or a preferred stand." />
        </Field>
      </section>

      <Button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-[#00A84F] text-base font-semibold hover:bg-[#059669] sm:w-auto sm:px-8">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Submitting…" : "Submit for verification"}
      </Button>
    </form>
  );
}
