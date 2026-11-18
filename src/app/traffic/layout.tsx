import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { buttonVariants } from "@/components/ui/button";
import { requireTrafficViewer } from "@/lib/auth";
import { signOut } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Traffic control",
  robots: { index: false, follow: false },
};

export default async function TrafficLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTrafficViewer();

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
          <Logo compact />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <p className="hidden items-center gap-1.5 text-sm font-semibold sm:flex">
            <ShieldCheck className="size-4 text-[#00A84F]" aria-hidden /> Traffic control
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs leading-tight md:block">
              <p className="font-medium">{viewer.isAdmin ? "Admin" : viewer.officerName || "Traffic officer"}</p>
              <p className="text-muted-foreground">{viewer.isAdmin ? viewer.email : viewer.station || viewer.email}</p>
            </div>
            {viewer.isAdmin ? (
              <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <LayoutDashboard aria-hidden /> Desk
              </Link>
            ) : null}
            <form action={signOut}>
              <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <LogOut aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-4">{children}</main>
    </div>
  );
}
