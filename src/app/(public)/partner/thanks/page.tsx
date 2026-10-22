import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Application received",
  robots: { index: false, follow: false },
};

export default function PartnerThanksPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6 sm:py-24">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#E7F8EE] text-[#00A84F]">
        <CheckCircle2 className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold text-[#042D58]">Documents received</h1>
      <p className="mt-4 leading-7 text-[#71869A]">
        The operations team will review your licence, RC and ID. When you are approved, open the MTUK Nagar Ride app and sign in with this email. Use the password you just chose, or your existing app password if this email was already registered. Then go online to pick up rides.
      </p>
      <p className="mt-3 text-sm text-[#71869A]">Until then the app will show your account as in review, and pickup stays locked.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="rounded-2xl bg-[#00A84F] px-5 py-2.5 text-sm font-semibold text-white">
          Back to home
        </Link>
        <Link href="/contact" className="rounded-2xl border border-[#DCE7F0] bg-white px-5 py-2.5 text-sm font-semibold text-[#042D58]">
          Contact the desk
        </Link>
      </div>
    </main>
  );
}
