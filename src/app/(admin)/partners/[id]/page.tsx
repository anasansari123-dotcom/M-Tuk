import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyValues, PageHeader, PartnerBadge, Section } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { PartnerActions } from "@/components/admin/partner-actions";
import { PartnerMessageForm } from "@/components/admin/partner-message-form";
import { AuditList } from "@/components/admin/audit-list";
import { getPartner, listAudit, listPartnerMessages, signedDocumentUrl } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import type { PartnerApplication } from "@/lib/types";

export const metadata: Metadata = { title: "Partner application" };

type DocKey = "selfie_path" | "id_path" | "aadhaar_back_path" | "pan_path" | "license_path" | "rc_path" | "photo_path";

// Selfie first, then the IDs it is matched against.
const docs: { key: DocKey; label: string; hint: string }[] = [
  { key: "selfie_path", label: "Live photo", hint: "Match the face with Aadhaar and licence" },
  { key: "id_path", label: "Aadhaar – front", hint: "Name, DOB and last 4 digits must match" },
  { key: "aadhaar_back_path", label: "Aadhaar – back", hint: "Address must match the form" },
  { key: "pan_path", label: "PAN card", hint: "PAN number and name must match" },
  { key: "license_path", label: "Driving licence", hint: "Number, validity and vehicle class" },
  { key: "rc_path", label: "Vehicle RC", hint: "Registration number must match" },
  { key: "photo_path", label: "Vehicle photo", hint: "Number plate visible" },
];

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const born = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday = now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function licenceState(row: PartnerApplication) {
  if (!row.license_expiry) return null;
  const days = Math.floor((new Date(row.license_expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { tone: "text-destructive", text: "Expired" };
  if (days < 60) return { tone: "text-amber-600", text: `Expires in ${days} days` };
  return null;
}

export default async function PartnerApplicationPage({ params }: PageProps<"/partners/[id]">) {
  const { id } = await params;
  const application = await getPartner(id);
  if (application.error) return <Notice tone="error">{application.error}</Notice>;
  if (!application.data) notFound();
  const row = application.data;
  const [urls, audit, messages] = await Promise.all([
    Promise.all(docs.map(async (doc) => [doc.key, await signedDocumentUrl(row[doc.key])] as const)).then(
      (entries) => Object.fromEntries(entries) as Record<DocKey, string | null>,
    ),
    listAudit({ from: 0, to: 19, targetType: "partner_application", targetId: row.id }),
    listPartnerMessages(row.id),
  ]);

  const age = ageFrom(row.dob);
  const licence = licenceState(row);
  const missing = docs.filter((doc) => !row[doc.key]).map((doc) => doc.label);

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
          Match the live photo with Aadhaar and licence, and check every number against the documents. Approval lets this partner pick up rides in the app with the same email.
        </Notice>
      ) : null}
      {row.status === "rejected" && row.note ? (
        <Notice tone="error" className="mb-6" title="Rejected">
          {row.note}
        </Notice>
      ) : null}
      {missing.length > 0 ? (
        <Notice tone="info" className="mb-6" title="Some documents are missing">
          Not uploaded: {missing.join(", ")}. Older applications were submitted before these were required.
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Section title="Personal details">
            <KeyValues
              items={[
                { label: "Email", value: row.email },
                { label: "Phone", value: row.phone || "—" },
                { label: "Date of birth", value: row.dob ? `${formatDate(row.dob)}${age !== null ? ` (${age} yrs)` : ""}` : "—" },
                { label: "Address", value: row.address ? `${row.address}${row.pincode ? ` – ${row.pincode}` : ""}` : "—" },
                { label: "City", value: row.city || "—" },
              ]}
            />
          </Section>
          <Section title="Identity, licence and vehicle">
            <KeyValues
              items={[
                { label: "Aadhaar", value: row.aadhaar_last4 ? <span className="font-mono">XXXX XXXX {row.aadhaar_last4}</span> : "—" },
                { label: "PAN", value: row.pan_number ? <span className="font-mono">{row.pan_number}</span> : "—" },
                { label: "Licence number", value: row.license_number ? <span className="font-mono">{row.license_number}</span> : "—" },
                {
                  label: "Licence valid till",
                  value: row.license_expiry ? (
                    <span>
                      {formatDate(row.license_expiry)} {licence ? <span className={`font-medium ${licence.tone}`}>· {licence.text}</span> : null}
                    </span>
                  ) : (
                    "—"
                  ),
                },
                { label: "Vehicle number", value: <span className="font-mono">{row.vehicle_number}</span> },
                { label: "Vehicle model", value: row.vehicle_model },
              ]}
            />
          </Section>
          <Section title="Application">
            <KeyValues
              items={[
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
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Section title="Documents" description="Signed links expire in one hour. Refresh the page if a file does not load. Click an image to open it full size.">
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc) => {
                const url = urls[doc.key];
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(row[doc.key]);
                return (
                  <figure key={doc.key} className="overflow-hidden rounded-xl border bg-muted/30">
                    <figcaption className="border-b px-3 py-2">
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.hint}</p>
                    </figcaption>
                    {url && isImage ? (
                      <a href={url} target="_blank" rel="noreferrer" className="block bg-background">
                        {/* Signed storage URLs are not in next/image remotePatterns on purpose. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={doc.label} className="h-56 w-full object-contain" />
                      </a>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="grid h-56 place-items-center text-sm text-primary hover:underline">
                        Open PDF
                      </a>
                    ) : (
                      <p className="grid h-56 place-items-center text-sm text-muted-foreground">Not uploaded</p>
                    )}
                  </figure>
                );
              })}
            </div>
          </Section>

          <Section title="Message the applicant" description="Saved on the application and shown to the driver in the MTUK Nagar Ride app.">
            <PartnerMessageForm applicationId={row.id} name={row.name} phone={row.phone} email={row.email} />
            {messages.error ? (
              <Notice tone="error" className="m-4">{messages.error}</Notice>
            ) : messages.data.length > 0 ? (
              <ol className="divide-y border-t">
                {messages.data.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm">
                    <p className="whitespace-pre-line">{item.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.admin_email || "Admin"} · {formatDateTime(item.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
          </Section>

          <Section title="Review history">
            {audit.error ? <Notice tone="error" className="m-4">{audit.error}</Notice> : <AuditList entries={audit.rows} />}
          </Section>
        </div>
      </div>
    </>
  );
}
