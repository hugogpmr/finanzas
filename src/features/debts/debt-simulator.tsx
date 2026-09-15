"use client";

import { useMemo, useState } from "react";
import { compareDebtStrategies, type DebtInput } from "@/lib/finance/debts";
import { DebtSimulatorChart } from "./debt-simulator-chart";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DebtSimulatorProps = {
  debts: DebtInput[];
  debtNamesById: Record<string, string>;
};

function payoffOrderLabel(order: string[], namesById: Record<string, string>) {
  return order.map((id) => namesById[id] ?? id).join(" → ");
}

export function DebtSimulator({ debts, debtNamesById }: DebtSimulatorProps) {
  const [extra, setExtra] = useState(0);

  const comparison = useMemo(() => compareDebtStrategies(debts, extra), [debts, extra]);

  const anyNegativeAmortization =
    comparison.avalanche.negativeAmortizationDebtIds.length > 0 ||
    comparison.snowball.negativeAmortizationDebtIds.length > 0;
  const neverPaidOff = comparison.avalanche.reachedMaxMonths || comparison.snowball.reachedMaxMonths;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 max-w-xs">
        <Label htmlFor="extra_payment">Extra mensual a mayores de las cuotas mínimas (€)</Label>
        <Input
          id="extra_payment"
          type="number"
          step="10"
          min="0"
          value={extra}
          onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      {anyNegativeAmortization && (
        <p className="rounded-lg border border-dashed border-destructive/50 p-3 text-sm text-destructive">
          Con estos importes, la cuota de alguna deuda no llega a cubrir ni el interés mensual: el
          saldo crecería en vez de bajar. Sube la cuota mínima o el extra mensual.
        </p>
      )}
      {neverPaidOff && !anyNegativeAmortization && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Con estos importes, liquidar todas las deudas llevaría más de 50 años. Prueba a subir el
          extra mensual.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Avalancha</CardTitle>
            <CardDescription>Primero la deuda con mayor TIN (menos intereses en total)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium tabular-nums">{comparison.avalanche.totalMonths}</span>{" "}
              meses hasta liquidar todo
            </p>
            <p>
              <span className="font-medium tabular-nums">
                {formatCurrency(comparison.avalanche.totalInterestPaid, "EUR")}
              </span>{" "}
              en intereses totales
            </p>
            <p className="text-xs text-muted-foreground">
              Orden: {payoffOrderLabel(comparison.avalanche.payoffOrder, debtNamesById)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Bola de nieve</CardTitle>
            <CardDescription>Primero la deuda con menor saldo (más motivador)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium tabular-nums">{comparison.snowball.totalMonths}</span>{" "}
              meses hasta liquidar todo
            </p>
            <p>
              <span className="font-medium tabular-nums">
                {formatCurrency(comparison.snowball.totalInterestPaid, "EUR")}
              </span>{" "}
              en intereses totales
            </p>
            <p className="text-xs text-muted-foreground">
              Orden: {payoffOrderLabel(comparison.snowball.payoffOrder, debtNamesById)}
            </p>
          </CardContent>
        </Card>
      </div>

      {comparison.interestSaved !== 0 && (
        <p className="text-sm text-muted-foreground">
          Eligiendo avalancha en vez de bola de nieve te ahorrarías{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(Math.abs(comparison.interestSaved), "EUR")}
          </span>{" "}
          en intereses
          {comparison.monthsSaved !== 0 && (
            <>
              {" "}
              y {comparison.monthsSaved > 0 ? "terminarías" : "tardarías"}{" "}
              <span className="font-medium text-foreground">
                {formatNumber(Math.abs(comparison.monthsSaved), 0)} meses
              </span>{" "}
              {comparison.monthsSaved > 0 ? "antes" : "más"}
            </>
          )}
          .
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Intereses totales por método</CardTitle>
        </CardHeader>
        <CardContent>
          <DebtSimulatorChart
            avalancheInterest={comparison.avalanche.totalInterestPaid}
            snowballInterest={comparison.snowball.totalInterestPaid}
          />
        </CardContent>
      </Card>
    </div>
  );
}
