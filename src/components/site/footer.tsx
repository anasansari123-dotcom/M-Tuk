import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { brand, nav } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#DCE7F0] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 md:gap-10 md:py-14">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-6 text-[#71869A]">{brand.description}</p>
          <p className="mt-3 text-sm font-semibold text-[#063F78]">{brand.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[#34516B] hover:text-[#042D58]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Operations</p>
          <ul className="mt-4 space-y-2.5 text-sm text-[#34516B]">
            <li>{brand.hours}</li>
            <li>
              <a href={`mailto:${brand.email}`} className="hover:text-[#042D58]">
                {brand.email}
              </a>
            </li>
            <li>
              <Link href="/login" className="hover:text-[#042D58]">
                Admin desk
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#DCE7F0] bg-[#F4F8FC]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-[#71869A] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p>Website, admin desk and mobile app share one network.</p>
        </div>
      </div>
    </footer>
  );
}
