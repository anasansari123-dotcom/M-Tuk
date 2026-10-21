import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyValues, PageHeader, PartnerBadge, Section } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { PartnerActions } from "@/components/admin/partner-actions";
import { getPartner, signedDocumentUrl } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Partner application" };

const docs: { key: "license_path" | "rc_path" | "photo_path" | "id_path"; label: string }[] = [
  { key: "license_path", label: "Driving licence" },
  { key: "rc_path", label: "Vehicle RC" },
  { key: "photo_path", label: "Vehicle photo" },
  { key: "id_path", label: "Aadhaar / ID" },
];

export default async function PartnerApplicationPage({ params }: PageProps<"/partners/[id]">) {
  const { id } = await params;
  const application = await getPartner(id);
  if (application.error) return <Notice tone="error">{application.error}</Notice>;
  if (!application.data) notFound();
  const row = application.data;
  const urls = Object.fromEntries(
    await Promise.all(docs.map(async (doc) => [doc.key, await signedDocumentUrl(row[doc.key])])),
  ) as Record<(typeof docs)[number]["key"], string | null>;

  return (
    <>
      <PageHeader
        title={row.name}
        description={<span className="inline-flex items-center gap-2">{row.vehicle_number} · {row.city} <PartnerBadge status={row.status} /></span>}
        back={{ href: "/partners", label: "Partners" }}
        actions={<PartnerActions applicationId={row.id} status={row.status} />}
      />
      {row.status === "pending" ? (
        <Notice tone="warning" className="mb-6" title="Waiting for verification">
          Check every document before approving. Approval lets this partner pick up rides in the MTUK Nagar Ride app with the same email.
        </Notice>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Application">
          <KeyValues
            items={[
              { label: "Email", value: row.email },
              { label: "Phone", value: row.phone || "—" },
              { label: "City", value: row.city || "—" },
              { label: "Vehicle number", value: <span className="font-mono">{row.vehicle_number}</span> },
              { label: "Vehicle model", value: row.vehicle_model },
              { label: "Licence number", value: row.license_number || "—" },
              { label: "Submitted", value: formatDateTime(row.created_at) },
              { label: "Last decision", value: row.reviewed_at ? formatDateTime(row.reviewed_at) : "Never reviewed" },
              ...(row.note ? [{ label: "Reason / note", value: row.note }] : []),
              ...(row.user_id
                ? [{ label: "App account", value: <Link href={`/drivers/${row.user_id}`} className="text-primary hover:underline">Open driver profile</Link> }]
                : [{ label: "App account", value: <span className="text-muted-foreground">Not linked yet — they sign in after approval</span> }]),
              ...(row.message ? [{ label: "Applicant note", value: row.message }] : []),
            ]}
          />
        </Section>
        <Section title="Documents" description="Signed links expire in one hour. Refresh the page if a file does not load." className="xl:col-span-2">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {docs.map((doc) => {
              const url = urls[doc.key];
              const isImage = /\.(jpg|jpeg|png|webp)$/i.test(row[doc.key]);
              return (
                <figure key={doc.key} className="overflow-hidden rounded-xl border bg-muted/30">
                  <figcaption className="border-b px-3 py-2 text-sm font-medium">{doc.label}</figcaption>
                  {url && isImage ? (
                    // Signed storage URLs are not in next/image remotePatterns on purpose.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={doc.label} className="max-h-80 w-full object-contain bg-background" />
                  ) : url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="block px-3 py-8 text-center text-sm text-primary hover:underline">
                      Open PDF
                    </a>
                  ) : (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </figure>
              );
            })}
          </div>
        </Section>
      </div>
    </>
  );
}
