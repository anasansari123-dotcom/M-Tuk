import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";
import { param, type SearchParams } from "@/lib/params";
import { supabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

const notices: Record<string, string> = {
  forbidden: "That account does not have admin access. Sign in with an admin account.",
  setup: "Admin access is not set up yet. Run supabase/admin.sql in Supabase, then add your account to admin_users.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = (await searchParams) as SearchParams;
  const notice = notices[param(params, "error")] ?? (supabaseConfigured ? "" : "The admin site is not configured. Set the Supabase environment variables.");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="size-5" aria-hidden />
          </span>
          MTUK Nagar Ride Admin
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Run the e-rickshaw network from one place.</h1>
          <p className="text-sidebar-muted">
            Verify drivers, follow live rides and review the numbers. Access is limited to approved administrators.
          </p>
        </div>
        <p className="text-sm text-sidebar-muted">Every admin action is recorded in the audit log.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <div className="mb-6 flex items-center gap-2 font-semibold lg:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" aria-hidden />
              </span>
              MTUK Nagar Ride Admin
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your administrator email and password.</p>
          </div>
          <LoginForm next={param(params, "next")} notice={notice} />
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
