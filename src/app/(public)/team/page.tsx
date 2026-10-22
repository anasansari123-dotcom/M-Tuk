import type { Metadata } from "next";
import Link from "next/link";
import { story, team } from "@/lib/site";

export const metadata: Metadata = {
  title: "Team",
  description: "The people behind MTUK Nagar Ride, a verified e-rickshaw network for the nagar.",
};

export default function TeamPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Team</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#042D58] sm:text-4xl">{story.intro}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {team.map((person) => (
          <article key={person.name} className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)] sm:p-6">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#042D58] text-xl font-extrabold text-white">
              {person.initials}
            </span>
            <h2 className="text-xl font-bold text-[#042D58]">{person.name}</h2>
          </article>
        ))}
      </div>

      <div className="mt-10 space-y-5 text-base leading-8 text-[#34516B]">
        {story.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {story.beliefs.map((item) => (
          <div key={item.title} className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(6,63,120,0.06)]">
            <h3 className="font-bold text-[#042D58]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#71869A]">{item.body}</p>
          </div>
        ))}
      </div>

      <Link
        href="/contact"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-2xl bg-[#00A84F] px-5 text-sm font-semibold text-white"
      >
        Write to us
      </Link>
    </main>
  );
}
