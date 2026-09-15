import Link from "next/link";
import type { DashboardData } from "./queries";
import { KpiCard } from "./kpi-card";
import { MonthlyEvolutionChart } from "./monthly-evolution-chart";
import { CategoryComparisonChart } from "./category-comparison-chart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Componente de presentación puro: recibe los datos ya calculados
// (src/features/dashboard/queries.ts) y no toca Supabase. Separado de la
// page.tsx para poder montarlo con datos falsos en una ruta /devtest y
// probar el layout/gráficas en el navegador sin necesitar sesión real.
export function DashboardView({ data }: { data: DashboardData }) {
  if (!data.hasAnyAccount) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Necesitas al menos una cuenta para ver tu dashboard.{" "}
          <Button variant="link" className="h-auto p-0" render={<Link href="/cuentas" />}>
            Crea una cuenta
          </Button>
        </p>
      </div>
    );
  }

  const { kpis } = data;
  const pct = (v: number | null) => (v !== null ? formatPercent(v) : null);
  const eur = (v: number | null) => (v !== null ? formatCurrency(v, "EUR") : null);
  const months = (v: number | null) => (v !== null ? `${formatNumber(v)} meses` : null);
  const years = (v: number | null) =>
    v === null ? null : v === 0 ? "¡Ya lo has alcanzado!" : `${formatNumber(v)} años`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Patrimonio y KPIs financieros. Los importes mensuales son el promedio de los
          últimos {data.hasAnyTransaction ? "3 meses con movimientos" : "meses"}, no solo el
          mes en curso.
        </p>
      </div>

      {!data.hasAnyTransaction && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no tienes transacciones registradas: el patrimonio neto ya se calcula con el
          saldo de tus cuentas, pero los KPIs de flujo de caja necesitan movimientos.{" "}
          <Button variant="link" className="h-auto p-0" render={<Link href="/transacciones" />}>
            Registra tu primera transacción
          </Button>
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Patrimonio
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard title="Patrimonio neto" value={eur(kpis.netWorthEur)} />
          <KpiCard
            title="Patrimonio líquido"
            value={eur(kpis.liquidNetWorthEur)}
            hint="Activos líquidos menos pasivos"
          />
          <KpiCard
            title="Múltiplo sobre ingresos"
            value={kpis.netWorthMultiple !== null ? `${formatNumber(kpis.netWorthMultiple)}x` : null}
            benchmark="~1x a los 30, 3x a los 40, 6x a los 50, 10x a los 67"
          />
          <KpiCard
            title="Activos vs. pasivos"
            value={eur(kpis.totalAssetsEur)}
            hint={`Pasivos: ${formatCurrency(kpis.totalLiabilitiesEur, "EUR")}`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Flujo de caja (promedio mensual)
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard title="Ingresos" value={eur(kpis.avgMonthlyIncomeEur)} />
          <KpiCard title="Gastos" value={eur(kpis.avgMonthlyExpensesEur)} />
          <KpiCard title="Cash flow neto" value={eur(kpis.netCashFlowEur)} />
          <KpiCard title="Tasa de ahorro" value={pct(kpis.savingsRatePct)} benchmark="15-20%" />
          <KpiCard
            title="Gastos fijos"
            value={pct(kpis.fixedExpenseRatioPct)}
            hint="% del gasto marcado como fijo en Categorías"
          />
          <KpiCard
            title="Necesidades (50/30/20)"
            value={pct(kpis.needsWantsSavingsPct?.needs ?? null)}
            benchmark="~50%"
          />
          <KpiCard
            title="Deseos (50/30/20)"
            value={pct(kpis.needsWantsSavingsPct?.wants ?? null)}
            benchmark="~30%"
          />
          <KpiCard
            title="Ahorro (50/30/20)"
            value={pct(kpis.needsWantsSavingsPct?.savings ?? null)}
            benchmark="~20%"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Colchón y endeudamiento
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            title="Fondo de emergencia"
            value={months(kpis.emergencyFundMonths)}
            hint="Activos líquidos ÷ gasto esencial mensual"
            benchmark="3-6 meses"
          />
          <KpiCard
            title="Ratio de liquidez"
            value={kpis.liquidityRatio !== null ? formatNumber(kpis.liquidityRatio) : null}
            hint="Activos líquidos ÷ gasto mensual total"
          />
          <KpiCard
            title="DTI (deuda/ingresos)"
            value={pct(kpis.dtiPct)}
            hint={kpis.dtiPct === 0 ? "Sin deudas registradas todavía" : undefined}
            benchmark="<36%"
          />
          <KpiCard
            title="Ratio de vivienda"
            value={pct(kpis.housingRatioPct)}
            hint="Pago de vivienda ÷ ingresos"
            benchmark="<28%"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Independencia financiera (FIRE)
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard title="FIRE number" value={eur(kpis.fireNumberEur)} hint="Gasto anual × 25 (regla del 4%)" />
          <KpiCard
            title="Años hasta FIRE"
            value={years(kpis.yearsToFire)}
            hint="Con tu ahorro y patrimonio actuales, retorno real estimado del 5%"
          />
        </div>
      </section>

      {data.hasAnyTransaction && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Evolución mensual</CardTitle>
              <CardDescription>Ingresos y gastos de los últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyEvolutionChart data={data.monthlySeries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gasto por categoría</CardTitle>
              <CardDescription>Este mes comparado con el anterior</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryComparison.length > 0 ? (
                <CategoryComparisonChart data={data.categoryComparison} />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Sin gastos categorizados este mes o el anterior todavía.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
