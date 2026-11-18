"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendPartnerMessage } from "@/lib/actions";

const templates = [
  "Your Aadhaar photo is not clear. Please submit a new application with a clear photo of both sides.",
  "Your driving licence photo is blurred. Please send a clear copy.",
  "The RC number does not match the vehicle number you entered. Please check and reapply.",
  "Your live photo does not match your ID. Please reapply with a clear selfie in good light.",
  "Please visit the MTUK desk with your original documents for verification.",
];

export function PartnerMessageForm({
  applicationId,
  name,
  phone,
  email,
}: {
  applicationId: string;
  name: string;
  phone: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(sendPartnerMessage, null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (textRef.current) textRef.current.value = "";
    } else {
      toast.error(state.message);
    }
  }, [state]);

  const greeting = `Hello ${name.split(" ")[0] || ""}, this is MTUK Nagar Ride about your partner application.`;
  const whatsapp = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(greeting)}` : null;
  const mail = `mailto:${email}?subject=${encodeURIComponent("Your MTUK Nagar Ride partner application")}&body=${encodeURIComponent(greeting)}`;

  const linkClass = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="space-y-4 p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <Textarea
          ref={textRef}
          name="body"
          rows={3}
          maxLength={1000}
          required
          placeholder="Write what the applicant should fix or bring. They see this in the MTUK Nagar Ride app."
        />
        <div className="flex flex-wrap gap-1.5">
          {templates.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                if (textRef.current) textRef.current.value = text;
                textRef.current?.focus();
              }}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {text.split(".")[0]}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Send message
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={linkClass}>
            <MessageCircle aria-hidden /> WhatsApp
          </a>
        ) : null}
        {phone ? (
          <a href={`tel:+91${phone}`} className={linkClass}>
            <Phone aria-hidden /> Call
          </a>
        ) : null}
        <a href={mail} className={linkClass}>
          <Mail aria-hidden /> Email
        </a>
      </div>
    </div>
  );
}
