import type { Metadata } from "next";
import Link from "next/link";
import { founder } from "@/lib/site";

export const metadata: Metadata = {
  title: "Founder",
  description: "Why MTUK Nagar Ride exists, and the person building a verified e-rickshaw network for the nagar.",
};

export default function FounderPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="rounded-[32px] bg-[#042D58] p-8 text-white">
          <div className="grid size-24 place-items-center rounded-3xl bg-[#00A84F] text-3xl font-extrabold">
            {founder.portrait}
          </div>
          <h1 className="mt-6 text-3xl font-extrabold">{founder.name}</h1>
          <p className="mt-1 text-sm font-semibold text-[#FFAA00]">{founder.role}</p>
          <p className="mt-2 text-sm text-white/70">{founder.location}</p>
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#042D58]"
          >
            Write to us
          </Link>
        </aside>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Founder</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#042D58] sm:text-4xl">{founder.intro}</h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-[#34516B]">
            {founder.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {founder.beliefs.map((item) => (
              <div key={item.title} className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)]">
                <h3 className="font-bold text-[#042D58]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
