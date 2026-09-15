"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "var(--destructive)";

export function MonthlyEvolutionChart({
  data,
}: {
  data: { label: string; incomeEur: number; expensesEur: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={70} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), "EUR")}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="incomeEur" name="Ingresos" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
        <Bar dataKey="expensesEur" name="Gastos" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
