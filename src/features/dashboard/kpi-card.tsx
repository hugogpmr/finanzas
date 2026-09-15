import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string | null;
  hint?: string;
  benchmark?: string;
};

// `value` en null significa "sin datos suficientes todavía" (p.ej. cero
// transacciones en los últimos meses): se muestra un guion en vez de NaN/0
// engañoso, para no aparentar un KPI real que aún no existe.
export function KpiCard({ title, value, hint, benchmark }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value ?? "—"}</CardTitle>
      </CardHeader>
      {(hint || benchmark) && (
        <CardContent className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {hint && <span>{hint}</span>}
          {benchmark && <span>Referencia: {benchmark}</span>}
        </CardContent>
      )}
    </Card>
  );
}
