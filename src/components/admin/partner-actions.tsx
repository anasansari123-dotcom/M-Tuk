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
import { reviewPartnerApplication } from "@/lib/actions";
import type { PartnerStatus } from "@/lib/types";

const copy: Record<Exclude<PartnerStatus, "pending"> | "pending", { button: string; title: string; body: string; needsNote: boolean }> = {
  approved: {
    button: "Approve partner",
    title: "Approve this partner?",
    body: "If they already have an app account it is marked approved and they can pick up rides. If not, approval waits for them and applies when they sign in.",
    needsNote: false,
  },
  rejected: {
    button: "Reject",
    title: "Reject this application?",
    body: "Give a reason. It is stored on the application and in the audit log.",
    needsNote: true,
  },
  pending: {
    button: "Move back to pending",
    title: "Move back to pending review?",
    body: "The application returns to the verification queue.",
    needsNote: false,
  },
};

const transitions: Record<PartnerStatus, PartnerStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["pending"],
  rejected: ["approved", "pending"],
};

export function PartnerActions({ applicationId, status }: { applicationId: string; status: PartnerStatus }) {
  const [target, setTarget] = useState<PartnerStatus | null>(null);
  const [state, action, pending] = useActionState(reviewPartnerApplication, null);

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
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="status" value={target} />
              <div className="grid gap-2">
                <Label htmlFor="partner-note">{current.needsNote ? "Reason (required)" : "Note (optional)"}</Label>
                <Textarea id="partner-note" name="note" maxLength={500} required={current.needsNote} rows={3} />
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
