"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelRide } from "@/lib/actions";

export function CancelRide({ rideId }: { rideId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelRide, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close the dialog after the server confirms
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancel ride
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => (!pending ? setOpen(next) : undefined)}>
        <AlertDialogContent>
          <form action={action} className="grid gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this ride?</AlertDialogTitle>
              <AlertDialogDescription>
                The passenger and driver apps will show the ride as cancelled. This cannot be undone and is recorded in the audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="rideId" value={rideId} />
            <div className="grid gap-2">
              <Label htmlFor="cancel-reason">Reason (required)</Label>
              <Textarea id="cancel-reason" name="reason" required maxLength={500} rows={3} />
            </div>
            {state && !state.ok ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Keep ride
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Cancel ride
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
