import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#00A84F] focus-visible:ring-offset-2", className)}
    >
      <Image
        src={brand.logo}
        alt={brand.name}
        width={320}
        height={120}
        priority
        className={cn("h-9 w-auto max-w-[min(220px,58vw)] object-contain object-left sm:h-11 sm:max-w-[240px]", compact && "h-8 max-w-[min(180px,52vw)] sm:h-9")}
      />
    </Link>
  );
}
