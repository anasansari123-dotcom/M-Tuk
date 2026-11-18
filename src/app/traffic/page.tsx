import type { Metadata } from "next";
import { requireTrafficViewer } from "@/lib/auth";
import { TrafficMap } from "./traffic-map";

export const metadata: Metadata = { title: "Live e-rickshaws" };

export default async function TrafficPage() {
  const viewer = await requireTrafficViewer();
  return <TrafficMap isOfficer={!viewer.isAdmin} />;
}
