"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Notice } from "@/components/admin/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTrafficOfficer, revokeTrafficOfficer } from "@/lib/actions";

export function CreateTrafficOfficerForm() {
  const [state, action, pending] = useActionState(createTrafficOfficer, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 p-4">
      {state ? <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice> : null}
      <div className="space-y-2">
        <Label htmlFor="officer-name">Officer name</Label>
        <Input id="officer-name" name="name" required maxLength={80} className="h-10" placeholder="SI Rakesh Sharma" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="officer-badge">Badge / belt no.</Label>
          <Input id="officer-badge" name="badgeNumber" required maxLength={40} className="h-10 uppercase" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="officer-station">Station / circle</Label>
          <Input id="officer-station" name="station" required maxLength={120} className="h-10" placeholder="Traffic Circle, Sadar" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-email">Official email</Label>
        <Input id="officer-email" name="email" type="email" required autoComplete="off" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officer-password">Password</Label>
        <Input id="officer-password" name="password" type="password" required minLength={10} autoComplete="new-password" className="h-10" />
        <p className="text-xs text-muted-foreground">At least 10 characters. Share it with the officer in person.</p>
      </div>
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Creating…" : "Create traffic police login"}
      </Button>
    </form>
  );
}

export function RevokeTrafficOfficerButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(revokeTrafficOfficer, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Remove access
      </Button>
    </form>
  );
}
