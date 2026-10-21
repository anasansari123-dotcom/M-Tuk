import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "What MTUK Nagar Ride is, who it is for, and how the website stays connected to the app.",
};

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
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">About</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#042D58]">
        The e-rickshaw layer for your nagar.
      </h1>
      <p className="mt-4 text-lg leading-8 text-[#71869A]">{brand.description}</p>

      <div className="mt-12 space-y-6">
        {pillars.map((item) => (
          <article key={item.title} className="rounded-3xl bg-white p-7 shadow-[0_12px_40px_rgba(6,63,120,0.06)]">
            <h2 className="text-xl font-bold text-[#042D58]">{item.title}</h2>
            <p className="mt-3 leading-7 text-[#34516B]">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-[28px] bg-[#042D58] p-8 text-white">
        <h2 className="text-2xl font-extrabold">How the website talks to the app</h2>
        <ol className="mt-6 space-y-4 text-white/80">
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
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/partner" className="rounded-2xl bg-[#00A84F] px-5 py-2.5 text-sm font-semibold text-white">
            Become a partner
          </Link>
          <Link href="/founder" className="rounded-2xl border border-white/20 px-5 py-2.5 text-sm font-semibold">
            Meet the founder
          </Link>
        </div>
      </div>
    </main>
  );
}
