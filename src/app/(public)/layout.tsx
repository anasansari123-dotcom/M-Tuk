import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { checkAdmin } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  // A signed-in admin keeps their session on the website and sees a Dashboard link.
  const admin = supabaseConfigured ? await checkAdmin().catch(() => null) : null;

  return (
    <div className="flex min-h-full flex-col overflow-x-hidden bg-[#F4F8FC]">
      <SiteHeader adminEmail={admin?.email ?? null} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
