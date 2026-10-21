import Link from "next/link";
import { RideStatusBadge } from "@/components/admin/blocks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatKm, formatRupees, shortId } from "@/lib/format";
import type { Ride } from "@/lib/types";

export function RideTable({ rides, hide = [] }: { rides: Ride[]; hide?: ("customer" | "driver")[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Ride</TableHead>
          {hide.includes("customer") ? null : <TableHead>Customer</TableHead>}
          {hide.includes("driver") ? null : <TableHead>Driver</TableHead>}
          <TableHead>Route</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Distance</TableHead>
          <TableHead className="text-right">Quoted fare</TableHead>
          <TableHead className="pr-4">Booked</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rides.map((ride) => (
          <TableRow key={ride.id}>
            <TableCell className="pl-4 font-mono text-xs">
              <Link href={`/rides/${ride.id}`} className="text-primary hover:underline">
                {shortId(ride.id)}
              </Link>
            </TableCell>
            {hide.includes("customer") ? null : (
              <TableCell>
                <Link href={`/customers/${ride.passenger_id}`} className="hover:underline">
                  {ride.passenger_name}
                </Link>
              </TableCell>
            )}
            {hide.includes("driver") ? null : (
              <TableCell>
                {ride.driver_id ? (
                  <Link href={`/drivers/${ride.driver_id}`} className="hover:underline">
                    {ride.driver_name || "Driver"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </TableCell>
            )}
            <TableCell className="max-w-64">
              <p className="truncate" title={`${ride.pickup} → ${ride.dropoff}`}>
                {ride.pickup} <span className="text-muted-foreground">→</span> {ride.dropoff}
              </p>
            </TableCell>
            <TableCell>
              <RideStatusBadge status={ride.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatKm(ride.distance_km)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatRupees(ride.fare)}</TableCell>
            <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">{formatDateTime(ride.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
