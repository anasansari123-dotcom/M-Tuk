"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revokeAdminAccess } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function RevokeAdminButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(revokeAdminAccess, null);

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
