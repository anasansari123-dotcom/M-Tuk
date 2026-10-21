import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { brand, nav } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#042D58] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">{brand.description}</p>
          <p className="mt-4 text-sm font-semibold text-[#FFAA00]">{brand.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white/75 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Operations</p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>{brand.hours}</li>
            <li>
              <a href={`mailto:${brand.email}`} className="hover:text-white">
                {brand.email}
              </a>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Admin desk
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p>Website, admin desk and mobile app share one Supabase project.</p>
        </div>
      </div>
    </footer>
  );
}
