"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#DCE7F0] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Logo compact className="min-w-0" />
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-[#E7F8EE] text-[#00A84F]" : "text-[#34516B] hover:bg-[#F4F8FC] hover:text-[#042D58]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="rounded-full px-3 py-1.5 text-sm text-[#71869A] hover:text-[#042D58]">
            Admin
          </Link>
          <Link
            href="/partner"
            className="rounded-full bg-[#00A84F] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,168,79,0.28)] hover:bg-[#059669]"
          >
            Become a partner
          </Link>
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl text-[#042D58] hover:bg-[#F4F8FC] lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-[#DCE7F0] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
          <nav className="grid gap-1">
            {nav
              .filter((item) => item.href !== "/partner")
              .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-[#042D58] hover:bg-[#F4F8FC]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-[#71869A]">
              Admin sign in
            </Link>
            <Link
              href="/partner"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[#00A84F] text-sm font-semibold text-white"
            >
              Become a partner
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
