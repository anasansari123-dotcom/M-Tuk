import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#00A84F]">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-2xl text-white shadow-[0_8px_20px_rgba(0,168,79,0.35)]",
          light ? "bg-[#00A84F]" : "bg-[#00A84F]",
        )}
      >
        <Zap className="size-5 fill-current" aria-hidden />
      </span>
      {compact ? (
        <span className="sr-only">MTUK Nagar Ride</span>
      ) : (
        <span className="leading-tight">
          <span className={cn("block text-lg font-extrabold tracking-tight", light ? "text-white" : "text-[#042D58]")}>
            MTUK
          </span>
          <span className={cn("block text-[11px] font-semibold tracking-[0.18em]", light ? "text-white/70" : "text-[#71869A]")}>
            NAGAR RIDE
          </span>
        </span>
      )}
    </Link>
  );
}
