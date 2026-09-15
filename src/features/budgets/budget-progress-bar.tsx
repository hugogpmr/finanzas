import { formatCurrency } from "@/lib/format";

type BudgetProgressBarProps = {
  spentEur: number;
  allocatedEur: number;
  alertThresholdPct: number | null;
};

// Sin interactividad: es una barra de progreso simple con <div>, no hace
// falta un componente de shadcn/ui dedicado para esto.
export function BudgetProgressBar({ spentEur, allocatedEur, alertThresholdPct }: BudgetProgressBarProps) {
  const pct = allocatedEur > 0 ? (spentEur / allocatedEur) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  const over = pct > 100;
  const warn = !over && alertThresholdPct !== null && pct >= alertThresholdPct;
  const barColor = over ? "bg-destructive" : warn ? "bg-amber-500" : "bg-foreground";
  const textColor = over ? "text-destructive" : warn ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className={`text-xs tabular-nums ${textColor}`}>
        {formatCurrency(spentEur, "EUR")} de {formatCurrency(allocatedEur, "EUR")}
        {over && " · superado"}
        {warn && " · cerca del límite"}
      </p>
    </div>
  );
}
