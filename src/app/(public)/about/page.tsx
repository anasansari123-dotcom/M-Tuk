import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Building2, Eye, Network, Store, Target, Truck, Users } from "lucide-react";
import { brand, companyAbout, team } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `${companyAbout.name}: ${companyAbout.tagline} The team behind ${brand.name}.`,
};

const focusIcons = [Network, Truck, Store, Building2, Users];

const pillars = [
  {
    title: "A nagar network, not a generic taxi layer",
    body: "E-rickshaws move people across short, familiar routes. MTUK is shaped around that: quoted fares, neighbourhood pickup, and a fleet that actually belongs to the area.",
  },
  {
    title: "Two products, one system",
    body: "Passengers book in the mobile app. Partners apply on this website. Admins verify documents and watch live rides on the same desk. Every record sits in the same Supabase project the app already uses.",
  },
  {
    title: "Trust is a gate, not a badge",
    body: "A service provider can sign in to the app after applying, but they cannot pick up rides until an administrator approves their documents. Verification is enforced on the ride accept path.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Company intro */}
      <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">About Us</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#042D58] sm:text-5xl">{companyAbout.name}</h1>
      <p className="mt-2 text-lg font-bold text-[#B08A3E] sm:text-xl">{companyAbout.tagline}</p>
      <div className="mt-6 max-w-4xl space-y-4 text-base leading-8 text-[#34516B] sm:text-lg">
        {companyAbout.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {/* Mission & vision */}
      <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2">
        <article className="rounded-3xl bg-[#042D58] p-6 text-white sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/10">
            <Target className="size-5 text-[#FFAA00]" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">Our Mission</h2>
          <p className="mt-3 leading-7 text-white/80">{companyAbout.mission}</p>
        </article>
        <article className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(6,63,120,0.06)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#E7F8EE]">
            <Eye className="size-5 text-[#00A84F]" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-[#042D58] sm:text-2xl">Our Vision</h2>
          <p className="mt-3 leading-7 text-[#34516B]">{companyAbout.vision}</p>
        </article>
      </div>

      {/* Core focus */}
      <section className="mt-10 sm:mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">Our Core Focus</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companyAbout.coreFocus.map((item, index) => {
            const Icon = focusIcons[index % focusIcons.length];
            return (
              <li
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(6,63,120,0.06)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E7F8EE]">
                  <Icon className="size-5 text-[#00A84F]" aria-hidden />
                </span>
                <span className="font-semibold text-[#042D58]">{item}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Founders: name + picture only */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">Our Founders</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {team.map((person) => (
            <Link
              key={person.slug}
              href={`/team#${person.slug}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_rgba(6,63,120,0.06)] transition hover:shadow-[0_12px_40px_rgba(6,63,120,0.14)]"
            >
              <Image
                src={person.photo}
                alt={`Portrait of ${person.name}`}
                width={320}
                height={360}
                className="aspect-[8/9] w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
              />
              <p className="px-4 py-4 text-center text-base font-bold text-[#042D58] sm:text-lg">Mr. {person.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Product: MTUK Nagar Ride */}
      <section className="mt-14 sm:mt-20">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Our product</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">
          {brand.name}: the e-rickshaw layer for your nagar.
        </h2>
        <p className="mt-4 text-base leading-8 text-[#71869A] sm:text-lg">{brand.description}</p>

        <div className="mt-8 space-y-4 sm:space-y-6">
          {pillars.map((item) => (
            <article key={item.title} className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)] sm:p-7">
              <h3 className="text-lg font-bold text-[#042D58] sm:text-xl">{item.title}</h3>
              <p className="mt-3 leading-7 text-[#34516B]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-[28px] bg-[#042D58] p-5 text-white sm:mt-12 sm:p-8">
        <h2 className="text-xl font-extrabold sm:text-2xl">How the website talks to the app</h2>
        <ol className="mt-6 space-y-4 text-sm text-white/80 sm:text-base">
          <li>
            <span className="font-semibold text-[#FFAA00]">1. Apply.</span> A partner submits profile and KYC here. That creates a pending application the admin desk can open.
          </li>
          <li>
            <span className="font-semibold text-[#FFAA00]">2. Verify.</span> An administrator checks licence, RC, photo and ID, then approves or rejects with a reason in the audit log.
          </li>
          <li>
            <span className="font-semibold text-[#FFAA00]">3. Drive.</span> The same email opens the driver side of the app. Only approved providers can accept a requested ride.
          </li>
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/partner" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#00A84F] px-5 text-sm font-semibold text-white">
            Become a partner
          </Link>
          <Link href="/team" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 px-5 text-sm font-semibold">
            Meet the team
          </Link>
        </div>
      </div>
    </main>
  );
}
