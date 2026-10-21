import type { Metadata } from "next";
import { PageHeader, Unsupported } from "@/components/admin/blocks";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" description="Collected payments, refunds and transaction history." />
      <Unsupported title="Payment integration is not implemented">
        <p>
          The MTUK Nagar Ride backend and database have no payment provider, transactions table, payment status or refund records. Rides store only
          the fare quoted at booking (<code className="rounded bg-muted px-1">rides.fare</code>), which is not proof that money was collected.
        </p>
        <p>
          To avoid reporting estimates as revenue, this page shows no figures. The dashboard and reports label the quoted-fare total
          explicitly as a quote.
        </p>
        <p className="text-foreground">What would be needed:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A payment provider (for example Razorpay, or a cash-collection confirmation step in the driver app).</li>
          <li>
            A <code className="rounded bg-muted px-1">payments</code> table written only by the backend from verified provider webhooks
            (ride_id, amount, method, status, provider reference, timestamps).
          </li>
          <li>Admin read policy via <code className="rounded bg-muted px-1">is_admin()</code>, as for the other tables.</li>
        </ul>
      </Unsupported>
    </>
  );
}
