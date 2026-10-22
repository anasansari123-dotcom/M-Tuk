"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createAdminAccount } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/admin/notice";

export function CreateAdminForm() {
  const [state, action, pending] = useActionState(createAdminAccount, null);

  return (
    <form action={action} className="grid gap-4 p-4 sm:grid-cols-2">
      {state ? <div className="sm:col-span-2"><Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice></div> : null}
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" name="email" type="email" required autoComplete="off" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input id="admin-password" name="password" type="password" required minLength={12} autoComplete="new-password" className="h-10" />
        <p className="text-xs text-muted-foreground">At least 12 characters. Share it with them out of band.</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="admin-note">Note (optional)</Label>
        <Input id="admin-note" name="note" className="h-10" placeholder="Operations, night shift…" maxLength={200} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" className="h-10" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? "Creating…" : "Create admin"}
        </Button>
      </div>
    </form>
  );
}
