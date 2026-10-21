"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Categorical slots in fixed order (validated with the dataviz palette checker).
// Orange is under 3:1 against white, so every chart has a legend, tooltip and a table view.
const series = { one: "#2a78d6", two: "#eb6834", three: "#1baf7a" };
const axis = { stroke: "#94a3b8", fontSize: 12 };
const grid = "#e5e7eb";

function bucketLabel(value: string, bucket: "day" | "week" | "month") {
  const date = new Date(`${value}T00:00:00Z`);
  if (bucket === "month") return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 4px 12px rgb(0 0 0 / 0.06)" },
  labelStyle: { color: "#0f172a", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#334155", padding: 0 },
};

export function RideTrendChart({
  data,
  bucket,
}: {
  data: { bucket: string; total: number; completed: number; cancelled: number }[];
  bucket: "day" | "week" | "month";
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Rides booked, completed and cancelled over time. The same numbers are in the table view.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={(v: string) => bucketLabel(v, bucket)} tickLine={false} axisLine={false} minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} {...axis} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
            labelFormatter={(v) => bucketLabel(String(v), bucket)}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#334155" }} />
          <Line type="monotone" dataKey="total" name="Booked" stroke={series.one} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
          <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke={series.two} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
          <Line type="monotone" dataKey="completed" name="Completed" stroke={series.three} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SignupTrendChart({
  data,
  bucket,
}: {
  data: { bucket: string; customers: number; drivers: number }[];
  bucket: "day" | "week" | "month";
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label="New customer and driver registrations over time. The same numbers are in the table view.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={(v: string) => bucketLabel(v, bucket)} tickLine={false} axisLine={false} minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} {...axis} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} labelFormatter={(v) => bucketLabel(String(v), bucket)} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#334155" }} />
          <Line type="monotone" dataKey="customers" name="Customers" stroke={series.one} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
          <Line type="monotone" dataKey="drivers" name="Drivers" stroke={series.two} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Single series: no legend; the section title names it.
export function HorizontalBars({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(120, data.length * 44 + 24) }} role="img" aria-label="Bar chart. The same numbers are listed beside it.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={10}>
          <CartesianGrid stroke={grid} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} {...axis} />
          <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} {...axis} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="value" name="Rides" fill={series.one} radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
