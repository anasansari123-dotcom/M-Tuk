import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { brand, partnerSteps, team } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} · ${brand.tagline}` },
  description: brand.description,
  robots: { index: true, follow: true },
};

const stats = [
  { value: "Live", label: "Ride tracking" },
  { value: "Free", label: "First ride" },
  { value: "KYC", label: "Before pickup" },
  { value: "1", label: "App + website" },
];

const forWhom = [
  {
    title: "Passengers",
    body: "Book a nearby e-rickshaw in the app, see the fare before you confirm, and follow the trip live.",
    points: ["Transparent quoted fare", "Live status from pickup to drop", "Cash at destination"],
    href: "/about",
    cta: "How rides work",
    accent: "from-[#063F78] to-[#079BE5]",
  },
  {
    title: "Service providers",
    body: "Apply here with your documents. After admin verification you sign in to the same app and pick up nagar rides.",
    points: ["Website KYC, app pickup", "Go online only when approved", "Earnings stay on your trips"],
    href: "/partner",
    cta: "Become a partner",
    accent: "from-[#00A84F] to-[#063F78]",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#042D58] text-white">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#00A84F]/25 blur-2xl sm:size-80" />
        <div className="pointer-events-none absolute bottom-0 -left-20 size-52 rounded-full bg-[#FFAA00]/20 blur-2xl sm:size-64" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <div className="mb-5 inline-flex rounded-2xl bg-white px-3 py-2 sm:mb-6 sm:px-4">
              <Image src={brand.logo} alt="" width={220} height={80} className="h-10 w-auto sm:h-12" />
            </div>
            <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {brand.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/75 sm:mt-5 sm:text-lg">{brand.description}</p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/partner"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#00A84F] px-6 font-semibold text-white shadow-[0_12px_30px_rgba(0,168,79,0.35)] hover:bg-[#059669] sm:w-auto"
              >
                Become a partner
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10 sm:w-auto"
              >
                About MTUK
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:rounded-3xl sm:p-5">
                <p className="text-xl font-extrabold sm:text-2xl">{stat.value}</p>
                <p className="mt-1 text-xs text-white/70 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {forWhom.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_50px_rgba(6,63,120,0.08)]">
              <div className={`h-2 bg-linear-to-r ${card.accent}`} />
              <div className="p-5 sm:p-8">
                <h2 className="text-xl font-extrabold text-[#042D58] sm:text-2xl">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#71869A] sm:text-base">{card.body}</p>
                <ul className="mt-5 space-y-2 sm:mt-6">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-[#34516B]">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#00A84F]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href={card.href} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#00A84F] sm:mt-8">
                  {card.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">For partners</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">
            Documents on the website. Rides in the app.
          </h2>
          <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {partnerSteps.map((item) => (
              <div key={item.step} className="rounded-3xl border border-[#DCE7F0] bg-[#F4F8FC] p-4 sm:p-5">
                <p className="text-sm font-extrabold text-[#FFAA00]">{item.step}</p>
                <h3 className="mt-2 font-bold text-[#042D58]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Team</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#042D58] sm:text-3xl">The people behind MTUK</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {team.map((person) => (
            <div key={person.name} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)]">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#042D58] text-lg font-extrabold text-white">
                {person.initials}
              </span>
              <p className="text-lg font-bold text-[#042D58]">{person.name}</p>
            </div>
          ))}
        </div>
        <Link href="/team" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#00A84F]">
          More about us
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:gap-6 sm:px-6 sm:pb-16 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Verified fleet", body: "Admin approves licence, RC and ID before a partner can accept a request." },
          { icon: Smartphone, title: "One login", body: "The email you use here is the same account that opens the driver side of the app." },
          { icon: MapPin, title: "Nagar routes", body: "Short trips, known stands, live status. Built for the neighbourhood, not the highway." },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)] sm:p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#E7F8EE] text-[#00A84F]">
              <item.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-bold text-[#042D58]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-5 overflow-hidden rounded-[28px] bg-[#063F78] px-5 py-8 text-white sm:rounded-[32px] sm:px-8 sm:py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#FFAA00]">Ready to earn on verified trips?</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Apply once. Drive when you are approved.</h2>
            <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">
              The operations desk sees your documents next to live rides. Nothing is duplicated. Nothing is guessed.
            </p>
          </div>
          <Link
            href="/partner"
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#FFAA00] px-6 font-semibold text-[#042D58] hover:bg-[#ffb81a] md:w-auto"
          >
            <Wallet className="size-4" aria-hidden />
            Start partner application
          </Link>
        </div>
      </section>
    </>
  );
}
