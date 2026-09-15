"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

const AVALANCHE_COLOR = "var(--foreground)";
const SNOWBALL_COLOR = "var(--muted-foreground)";

export function DebtSimulatorChart({
  avalancheInterest,
  snowballInterest,
}: {
  avalancheInterest: number;
  snowballInterest: number;
}) {
  const data = [
    { name: "Avalancha", interest: avalancheInterest, fill: AVALANCHE_COLOR },
    { name: "Bola de nieve", interest: snowballInterest, fill: SNOWBALL_COLOR },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
        <Tooltip formatter={(value) => formatCurrency(Number(value), "EUR")} contentStyle={{ fontSize: 12 }} />
        <Bar dataKey="interest" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
