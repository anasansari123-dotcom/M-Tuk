import type { Metadata } from "next";
import { AuditList } from "@/components/admin/audit-list";
import { FilterTabs, PageHeader, Pagination, TableCard } from "@/components/admin/blocks";
import { Notice } from "@/components/admin/notice";
import { auditActions, listAudit, pageSize } from "@/lib/data";
import { readEnum, readPage, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogsPage({ searchParams }: PageProps<"/audit-logs">) {
  const params = (await searchParams) as SearchParams;
  const { page, from, to } = readPage(params);
  const action = readEnum(params, "action", auditActions);
  const result = await listAudit({ from, to, action });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin change, written in the same database transaction as the change itself. Entries cannot be edited or deleted from the app."
      />
      {result.error ? <Notice tone="error" className="mb-4">{result.error}</Notice> : null}
      <TableCard
        toolbar={
          <FilterTabs
            path="/audit-logs"
            params={params}
            name="action"
            current={action}
            options={[
              { value: null, label: "All actions" },
              { value: "driver.status_changed", label: "Driver verification" },
              { value: "ride.cancelled", label: "Ride cancellations" },
            ]}
          />
        }
        footer={<Pagination path="/audit-logs" params={params} page={page} total={result.total} pageSize={pageSize} />}
      >
        <AuditList entries={result.rows} showTarget />
      </TableCard>
    </>
  );
}
