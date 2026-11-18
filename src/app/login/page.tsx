import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/auth";
import { param, type SearchParams } from "@/lib/params";
import { supabaseConfigured } from "@/lib/env";
import { brand } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

const notices: Record<string, string> = {
  forbidden: "That account does not have access. Sign in with an admin or traffic police account.",
  setup: "Admin access is not set up yet. Run supabase/admin.sql in Supabase, then add your account to admin_users.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = (await searchParams) as SearchParams;
  const next = param(params, "next");

  // Already signed in as admin: skip the form and go where they were heading.
  if (supabaseConfigured && !param(params, "error") && (await checkAdmin().catch(() => null))) {
    redirect(next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && next !== "/login" ? next : "/");
  }
  const notice = notices[param(params, "error")] ?? (supabaseConfigured ? "" : "The admin site is not configured. Set the Supabase environment variables.");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#042D58] p-10 text-white lg:flex">
        <Link href="/" className="inline-flex w-fit rounded-2xl bg-white px-3 py-2">
          <Image src={brand.logo} alt={brand.name} width={200} height={72} className="h-10 w-auto" />
        </Link>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Run the e-rickshaw network from one place.</h1>
          <p className="text-white/70">
            Verify drivers, follow live rides and review the numbers. Access is limited to approved administrators.
          </p>
        </div>
        <p className="text-sm text-white/50">Every admin action is recorded in the audit log.</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <Link href="/" className="mb-6 inline-flex lg:hidden">
              <Image src={brand.logo} alt={brand.name} width={200} height={72} className="h-10 w-auto" />
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your administrator email and password.</p>
          </div>
          <LoginForm next={next} notice={notice} />
          <p className="text-sm text-muted-foreground">
            Looking for the public site?{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              Back to MTUK Nagar Ride
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
