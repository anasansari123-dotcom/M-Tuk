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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { setDriverStatus } from "@/lib/actions";
import type { VerificationStatus } from "@/lib/types";

const copy: Record<VerificationStatus, { button: string; title: string; body: string; needsNote: boolean }> = {
  approved: { button: "Approve", title: "Approve this driver?", body: "The driver is marked approved. This is recorded in the audit log.", needsNote: false },
  rejected: { button: "Reject", title: "Reject this driver?", body: "Give a reason. It is stored with the driver record and in the audit log.", needsNote: true },
  suspended: { button: "Suspend", title: "Suspend this driver?", body: "Give a reason. You can reinstate the driver later by approving them again.", needsNote: true },
  pending: { button: "Move back to pending", title: "Move back to pending review?", body: "The driver returns to the verification queue.", needsNote: false },
};

// Which status changes make sense from each status.
const transitions: Record<VerificationStatus, VerificationStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["suspended"],
  rejected: ["approved", "pending"],
  suspended: ["approved"],
};

export function DriverActions({ driverId, status }: { driverId: string; status: VerificationStatus }) {
  const [target, setTarget] = useState<VerificationStatus | null>(null);
  const [state, action, pending] = useActionState(setDriverStatus, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close the dialog after the server confirms
      setTarget(null);
    }
  }, [state]);

  const current = target ? copy[target] : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions[status].map((next) => (
          <Button
            key={next}
            variant={next === "approved" ? "default" : next === "pending" ? "outline" : "destructive"}
            onClick={() => setTarget(next)}
          >
            {copy[next].button}
          </Button>
        ))}
      </div>
      <AlertDialog open={target !== null} onOpenChange={(open) => (!open && !pending ? setTarget(null) : undefined)}>
        <AlertDialogContent>
          {current && target ? (
            <form action={action} className="grid gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>{current.title}</AlertDialogTitle>
                <AlertDialogDescription>{current.body}</AlertDialogDescription>
              </AlertDialogHeader>
              <input type="hidden" name="driverId" value={driverId} />
              <input type="hidden" name="status" value={target} />
              <div className="grid gap-2">
                <Label htmlFor="driver-note">{current.needsNote ? "Reason (required)" : "Note (optional)"}</Label>
                <Textarea id="driver-note" name="note" maxLength={500} required={current.needsNote} rows={3} />
              </div>
              {state && !state.ok ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
              <AlertDialogFooter>
                <Button type="button" variant="outline" onClick={() => setTarget(null)} disabled={pending}>
                  Keep as is
                </Button>
                <Button type="submit" variant={target === "approved" ? "default" : target === "pending" ? "outline" : "destructive"} disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {current.button}
                </Button>
              </AlertDialogFooter>
            </form>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
