"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createProviderAccount } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/admin/notice";

export function CreateProviderForm() {
  const [state, action, pending] = useActionState(createProviderAccount, null);

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      {state && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required autoComplete="name" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" required inputMode="numeric" className="h-10" placeholder="98765 43210" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="off" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">App password</Label>
          <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="h-10" />
          <p className="text-xs text-muted-foreground">They use this email and password in the MTUK Nagar Ride app.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleNumber">Vehicle number</Label>
          <Input id="vehicleNumber" name="vehicleNumber" required className="h-10 uppercase" placeholder="DL 1E 4821" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleModel">Vehicle model</Label>
          <Input id="vehicleModel" name="vehicleModel" required className="h-10" defaultValue="E-Rickshaw" />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <input type="checkbox" name="approveNow" value="1" className="mt-1" />
        <span>
          <span className="font-medium">Verify now</span>
          <span className="block text-muted-foreground">Approve this provider so they can go online and pick up rides immediately. Leave unchecked to review them later on the driver page.</span>
        </span>
      </label>
      <Button type="submit" className="h-10 w-fit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? "Saving…" : "Add service provider"}
      </Button>
    </form>
  );
}
