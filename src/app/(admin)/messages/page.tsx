import type { Metadata } from "next";
import { EmptyState, PageHeader, Pagination, TableCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listMessages, pageSize } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readPage, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const result = await listMessages({ from, to });

  return (
    <>
      <PageHeader title="Contact messages" description="Enquiries submitted on the public contact page." />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <TableCard footer={<Pagination path="/messages" params={params} page={page} total={result.total} pageSize={pageSize} />}>
        {result.rows.length === 0 ? (
          <EmptyState title="No messages yet" body="The contact form on the website writes here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="pr-4">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                    {row.phone ? <p className="text-xs text-muted-foreground">{row.phone}</p> : null}
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{row.subject || "Website enquiry"}</TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">{row.message}</TableCell>
                  <TableCell className="pr-4 whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  );
}
