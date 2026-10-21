import type { Metadata } from "next";
import { PartnerForm } from "@/components/site/partner-form";
import { partnerSteps } from "@/lib/site";

export const metadata: Metadata = {
  title: "Become a partner",
  description: "Submit your e-rickshaw documents. After MTUK verifies you, sign in to the app and pick up rides.",
};

export default function PartnerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#00A84F] uppercase">Become a partner</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#042D58]">
          Submit documents. Get verified. Pick up rides.
        </h1>
        <p className="mt-4 text-lg leading-8 text-[#71869A]">
          This application is the KYC queue for the MTUK Nagar Ride app. After an administrator approves you, sign in on your phone with the same email and go online.
        </p>
      </div>

      <ol className="mt-10 grid gap-3 md:grid-cols-4">
        {partnerSteps.map((item) => (
          <li key={item.step} className="rounded-2xl border border-[#DCE7F0] bg-white px-4 py-4">
            <p className="text-xs font-extrabold text-[#FFAA00]">{item.step}</p>
            <p className="mt-1 text-sm font-bold text-[#042D58]">{item.title}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-[32px] bg-white p-6 shadow-[0_16px_50px_rgba(6,63,120,0.08)] sm:p-10">
        <PartnerForm />
      </div>
    </main>
  );
}
