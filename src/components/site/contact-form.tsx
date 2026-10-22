"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/lib/public-actions";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, null);

  return (
    <form action={action} className="space-y-4">
      {state ? (
        <p
          role="status"
          className={
            state.ok
              ? "rounded-2xl bg-[#E7F8EE] px-4 py-3 text-sm text-[#00A84F]"
              : "rounded-2xl bg-[#FDEBED] px-4 py-3 text-sm text-[#EF2435]"
          }
        >
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="h-11" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" className="h-11" placeholder="Partnership, ride issue, press…" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required minLength={10} rows={5} className="min-h-32" />
      </div>
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-[#00A84F] px-6 font-semibold hover:bg-[#059669] sm:h-11 sm:w-auto">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
