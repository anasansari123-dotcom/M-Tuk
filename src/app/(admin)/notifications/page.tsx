import type { Metadata } from "next";
import { PageHeader, Unsupported } from "@/components/admin/blocks";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Customer and driver notifications and service announcements." />
      <Unsupported title="No notification system exists yet">
        <p>
          The mobile app has no push notifications (expo-notifications is not installed and no device tokens are stored), and the backend
          sends no email or SMS. Ride status changes reach the apps only through Supabase Realtime while the app is open.
        </p>
        <p>Because no delivery service exists, this page cannot send anything, and it does not pretend to.</p>
        <p className="text-foreground">Smallest safe path to add it:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Add expo-notifications to the app and save each device&apos;s Expo push token in a new table (own-row RLS).</li>
          <li>Add a backend endpoint, admin-only, that sends through the Expo Push API and stores each ticket and receipt status.</li>
          <li>Show delivery status here from those stored receipts, with a confirmation step and a duplicate-send guard for bulk sends.</li>
        </ul>
      </Unsupported>
    </>
  );
}
