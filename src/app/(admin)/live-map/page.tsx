import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { listActiveRides } from "@/lib/data";
import { LiveMap } from "./live-map";

export const metadata: Metadata = { title: "Live map" };

export default async function LiveMapPage() {
  const rides = await listActiveRides();
  return (
    <>
      <PageHeader
        title="Live map"
        description="Pickup points of rides that are searching, assigned or in progress. Select a ride to see its destination."
      />
      <Notice tone="info" className="mb-4" title="Driver GPS is not shown">
        The mobile app uses the driver&apos;s location on the phone but never saves it, so there are no live driver positions to show.
        Markers here are the ride pickup and destination coordinates saved at booking. See the README for a proposal to add consented
        driver location sharing.
      </Notice>
      <LiveMap initialRides={rides.data} initialError={rides.error} />
    </>
  );
}
