"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

const CURRENT_COLOR = "var(--foreground)";
const PREVIOUS_COLOR = "var(--muted-foreground)";

export function CategoryComparisonChart({
  data,
}: {
  data: { category: string; currentEur: number; previousEur: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={110} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), "EUR")}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="previousEur" name="Mes anterior" fill={PREVIOUS_COLOR} radius={[0, 3, 3, 0]} />
        <Bar dataKey="currentEur" name="Este mes" fill={CURRENT_COLOR} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
