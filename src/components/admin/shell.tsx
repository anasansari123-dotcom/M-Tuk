"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { brand } from "@/lib/site";
import { navSections } from "@/components/admin/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";

const collapsedKey = "mtuk-admin-sidebar-collapsed";

function NavLinks({
  collapsed,
  onNavigate,
  pendingPartners,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  pendingPartners?: number | null;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navSections.map((section) => (
        <div key={section.label} className="space-y-1">
          {collapsed ? null : (
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-sidebar-muted uppercase">{section.label}</p>
          )}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge = href === "/partners" ? pendingPartners : null;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} aria-hidden />
                {collapsed ? <span className="sr-only">{label}</span> : <span className="flex-1">{label}</span>}
                {!collapsed && badge ? (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] leading-4 font-semibold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex h-14 items-center gap-2 px-3 font-semibold text-sidebar-accent-foreground", collapsed && "justify-center px-0")}>
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-0.5">
        <Image src={brand.logo} alt="" width={72} height={32} className="h-7 w-auto object-contain" />
      </span>
      {collapsed ? <span className="sr-only">MTUK Nagar Ride Admin</span> : <span>MTUK Nagar Ride Admin</span>}
    </Link>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-sm md:block"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        if (q) router.push(`/rides?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <label htmlFor="global-search" className="sr-only">
        Search rides by ID, name, place or vehicle
      </label>
      <input
        id="global-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search rides by ID, name, place…"
        className="h-9 w-full rounded-md border bg-background pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      />
    </form>
  );
}

export function AdminShell({
  email,
  pendingDrivers,
  pendingPartners,
  children,
}: {
  email: string;
  pendingDrivers: number | null;
  pendingPartners?: number | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a stored preference after hydration
      setCollapsed(localStorage.getItem(collapsedKey) === "1");
    } catch {
      // Storage can be unavailable; the sidebar simply starts expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(collapsedKey, current ? "0" : "1");
      } catch {}
      return !current;
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex print:hidden",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Brand collapsed={collapsed} />
        <NavLinks collapsed={collapsed} pendingPartners={pendingPartners} />
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
            {collapsed ? null : "Collapse"}
          </button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand collapsed={false} />
          <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} pendingPartners={pendingPartners} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6 print:hidden">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/partners?status=pending"
              className="relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={
                pendingPartners
                  ? `${pendingPartners} partner applications waiting`
                  : pendingDrivers
                    ? `${pendingDrivers} drivers waiting for verification`
                    : "Verification queue"
              }
              title="Partner applications waiting for verification"
            >
              <Bell className="size-4" aria-hidden />
              {(pendingPartners || pendingDrivers) ? (
                <span className="absolute top-1 right-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-semibold text-white">
                  {(pendingPartners ?? 0) + (pendingDrivers ?? 0) > 99 ? "99+" : (pendingPartners ?? 0) + (pendingDrivers ?? 0)}
                </span>
              ) : null}
            </Link>
            <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground uppercase" aria-hidden>
                {email.slice(0, 2) || "AD"}
              </span>
              <div className="leading-tight">
                <p className="max-w-48 truncate text-sm font-medium">{email || "Administrator"}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                <LogOut aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
