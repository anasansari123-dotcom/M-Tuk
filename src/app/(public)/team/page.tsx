import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { company, story, team } from "@/lib/site";

export const metadata: Metadata = {
  title: "Leadership",
  description: `The leadership team of ${company}, the company behind MTUK Nagar Ride.`,
};

export default function TeamPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Leadership</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#042D58] sm:text-4xl">
        The people leading {company}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-[#71869A] sm:text-lg">
        MTUK Nagar Ride is built by {company}. Our leadership brings together startup incubation,
        academic research and hands-on engineering to make local mobility simple and trusted.
      </p>

      {/* Quick jump links */}
      <nav aria-label="Leadership profiles" className="mt-8 grid gap-3 sm:grid-cols-3">
        {team.map((person) => (
          <a
            key={person.slug}
            href={`#${person.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_12px_40px_rgba(6,63,120,0.06)] transition hover:shadow-[0_12px_40px_rgba(6,63,120,0.12)]"
          >
            <Image
              src={person.photo}
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-xl object-cover object-top"
            />
            <span className="min-w-0">
              <span className="block font-bold text-[#042D58]">{person.name}</span>
              <span className="block truncate text-xs font-semibold text-[#B08A3E]">{person.title}</span>
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8 sm:mt-14 sm:space-y-10">
        {team.map((person) => (
          <article
            key={person.slug}
            id={person.slug}
            className="scroll-mt-24 overflow-hidden rounded-[28px] bg-white shadow-[0_12px_40px_rgba(6,63,120,0.06)]"
          >
            {/* Header */}
            <header className="flex flex-col gap-5 bg-[#F2F5F9] p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-8">
              <Image
                src={person.photo}
                alt={`Portrait of ${person.name}`}
                width={160}
                height={192}
                className="h-48 w-40 shrink-0 rounded-2xl object-cover object-top shadow-md ring-4 ring-white"
              />
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">
                  Mr. {person.name}
                </h2>
                <p className="mt-2 text-sm font-bold tracking-wide text-[#B08A3E] uppercase">
                  {person.title} <span className="text-[#C9B27F]">|</span> {company}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {person.highlights.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#34516B]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </header>

            <div className="p-5 sm:p-8">
              {/* Profile */}
              <h3 className="border-b-2 border-[#B08A3E]/60 pb-2 text-sm font-bold tracking-[0.15em] text-[#042D58] uppercase">
                Professional profile
              </h3>
              <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#34516B] sm:text-justify">
                {person.bio.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {/* Roles + focus */}
              <div className="mt-8 grid gap-6 rounded-2xl bg-[#F7F9FB] p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <h4 className="text-sm font-bold tracking-[0.12em] text-[#042D58] uppercase">
                    Current professional roles
                  </h4>
                  <ul className="mt-4 space-y-4">
                    {person.roles.map((role) => (
                      <li key={role.title}>
                        <p className="font-bold text-[#042D58]">{role.title}</p>
                        {role.org.map((line) => (
                          <p key={line} className="text-sm leading-6 text-[#34516B]">
                            {line}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-[0.12em] text-[#042D58] uppercase">
                    Areas of professional focus
                  </h4>
                  <ul className="mt-4 space-y-2">
                    {person.focus.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-[#34516B]">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#00A84F]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Story */}
      <section className="mt-14 sm:mt-20">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Our story</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#042D58] sm:text-3xl">{story.intro}</h2>
        <div className="mt-6 space-y-5 text-base leading-8 text-[#34516B]">
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
      </section>

      <Link
        href="/contact"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-2xl bg-[#00A84F] px-5 text-sm font-semibold text-white"
      >
        Write to us
      </Link>
    </main>
  );
}
