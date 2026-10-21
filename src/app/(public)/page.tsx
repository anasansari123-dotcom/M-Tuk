import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Smartphone, Wallet, Zap } from "lucide-react";
import { brand, partnerSteps } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} · ${brand.tagline}` },
  description: brand.description,
  robots: { index: true, follow: true },
};

const stats = [
  { value: "Live", label: "Ride tracking" },
  { value: "₹30", label: "Fares from" },
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
        <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-[#00A84F]/25 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 -left-20 size-64 rounded-full bg-[#FFAA00]/20 blur-2xl" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 size-40 rounded-full bg-[#079BE5]/20" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#FFAA00]">
              <Zap className="size-3.5" aria-hidden />
              E-rickshaw network for your nagar
            </p>
            <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              {brand.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-white/75">{brand.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/partner"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#00A84F] px-6 font-semibold text-white shadow-[0_12px_30px_rgba(0,168,79,0.35)] hover:bg-[#059669]"
              >
                Become a partner
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10"
              >
                About MTUK
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-2xl font-extrabold">{stat.value}</p>
                <p className="mt-1 text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {forWhom.map((card) => (
            <article key={card.title} className="overflow-hidden rounded-[28px] bg-white shadow-[0_16px_50px_rgba(6,63,120,0.08)]">
              <div className={`h-2 bg-linear-to-r ${card.accent}`} />
              <div className="p-8">
                <h2 className="text-2xl font-extrabold text-[#042D58]">{card.title}</h2>
                <p className="mt-3 text-[#71869A]">{card.body}</p>
                <ul className="mt-6 space-y-2">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-[#34516B]">
                      <BadgeCheck className="size-4 text-[#00A84F]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href={card.href} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#00A84F]">
                  {card.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">For partners</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-[#042D58]">
            Documents on the website. Rides in the app.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {partnerSteps.map((item) => (
              <div key={item.step} className="rounded-3xl border border-[#DCE7F0] bg-[#F4F8FC] p-5">
                <p className="text-sm font-extrabold text-[#FFAA00]">{item.step}</p>
                <h3 className="mt-2 font-bold text-[#042D58]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Verified fleet", body: "Admin approves licence, RC and ID before a partner can accept a request." },
          { icon: Smartphone, title: "One login", body: "The email you use here is the same account that opens the driver side of the app." },
          { icon: MapPin, title: "Nagar routes", body: "Short trips, known stands, live status. Built for the neighbourhood, not the highway." },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(6,63,120,0.06)]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#E7F8EE] text-[#00A84F]">
              <item.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-bold text-[#042D58]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[32px] bg-[#063F78] px-8 py-10 text-white md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-[#FFAA00]">Ready to earn on verified trips?</p>
            <h2 className="mt-2 text-3xl font-extrabold">Apply once. Drive when you are approved.</h2>
            <p className="mt-2 max-w-xl text-white/75">
              The operations desk sees your documents next to live rides. Nothing is duplicated. Nothing is guessed.
            </p>
          </div>
          <Link
            href="/partner"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#FFAA00] px-6 font-semibold text-[#042D58] hover:bg-[#ffb81a]"
          >
            <Wallet className="size-4" aria-hidden />
            Start partner application
          </Link>
        </div>
      </section>
    </>
  );
}
