import type { AllocationSlice } from "@/lib/finance/investments";
import { formatCurrency, formatPercent } from "@/lib/format";

export function AllocationBreakdown({ title, slices }: { title: string; slices: AllocationSlice[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {slices.map((slice) => (
            <div key={slice.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{slice.key}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(slice.valueEur, "EUR")} · {formatPercent(slice.pct)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${Math.min(100, slice.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
