import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/auth";
import { readRange, type SearchParams } from "@/lib/params";
import { createClient } from "@/lib/supabase/server";
import { passengerColumns, providerColumns, rideColumns } from "@/lib/types";

// CSV exports for one date range at a time, generated on the server and capped, so the
// browser never pulls the whole database. Same admin check and RLS as every page.
const maxRows = 10_000;
const batch = 1000;

const exports = {
  rides: { table: "rides", columns: rideColumns },
  customers: { table: "passengers", columns: passengerColumns },
  drivers: { table: "providers", columns: providerColumns },
} as const;

// Prefix values that spreadsheets would run as formulas.
function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest, context: RouteContext<"/api/export/[kind]">) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { kind } = await context.params;
  const spec = exports[kind as keyof typeof exports];
  if (!spec) return NextResponse.json({ error: "Unknown export." }, { status: 404 });

  const params: SearchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const range = readRange(params);
  const supabase = await createClient();
  const columns = spec.columns.split(",").map((column) => column.trim());
  const lines = [columns.join(",")];
  let truncated = false;

  for (let offset = 0; offset < maxRows; offset += batch) {
    const { data, error } = await supabase
      .from(spec.table)
      .select(spec.columns)
      .gte("created_at", range.from.toISOString())
      .lt("created_at", range.to.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + batch - 1);
    if (error) return NextResponse.json({ error: "Export failed. Try a shorter range." }, { status: 500 });
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of rows) lines.push(columns.map((column) => cell(row[column])).join(","));
    if (rows.length < batch) break;
    if (offset + batch >= maxRows) truncated = true;
  }

  const filename = `erido-${kind}-${range.fromInput}-to-${range.toInput}${truncated ? "-first-10000" : ""}.csv`;
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
