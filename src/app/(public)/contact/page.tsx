import type { Metadata } from "next";
import { Mail, Phone, Clock } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the MTUK Nagar Ride team about partnerships, rides, or the product.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Contact</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#042D58]">We are on the desk.</h1>
        <p className="mt-4 text-lg text-[#71869A]">
          Partnerships, press, passenger issues and product questions all land with the same operations team that verifies drivers.
        </p>
        <ul className="mt-8 space-y-4">
          <li className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-[#E7F8EE] text-[#00A84F]">
              <Mail className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-[#71869A]">Email</p>
              <a href={`mailto:${brand.email}`} className="font-semibold text-[#042D58]">
                {brand.email}
              </a>
            </div>
          </li>
          {brand.phone ? (
            <li className="flex gap-3 rounded-2xl bg-white p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#FFF4D9] text-[#8A5A00]">
                <Phone className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-[#71869A]">Phone</p>
                <p className="font-semibold text-[#042D58]">{brand.phone}</p>
              </div>
            </li>
          ) : null}
          <li className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-[#E7F5FD] text-[#079BE5]">
              <Clock className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-[#71869A]">Hours</p>
              <p className="font-semibold text-[#042D58]">{brand.hours}</p>
            </div>
          </li>
        </ul>
      </div>
      <div className="rounded-[32px] bg-white p-6 shadow-[0_16px_50px_rgba(6,63,120,0.08)] sm:p-8">
        <h2 className="text-xl font-extrabold text-[#042D58]">Send a message</h2>
        <p className="mt-1 mb-6 text-sm text-[#71869A]">It is stored for the admin desk. We reply on the email you give.</p>
        <ContactForm />
      </div>
    </main>
  );
}
