"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { GoalDialog } from "./goal-dialog";
import { EMERGENCY_FUND_DEFAULT_MONTHS } from "./types";
import { Button } from "@/components/ui/button";

type AccountOption = { id: string; name: string; currency: string };

// Botón de acceso rápido: abre el mismo diálogo de objetivo pero pre-rellenado
// para un fondo de emergencia de 6 meses, usando el gasto esencial mensual
// medio que ya calcula el dashboard (Sprint 2) en vez de pedírselo otra vez
// al usuario.
export function EmergencyFundTemplateButton({
  accounts,
  avgEssentialMonthlyExpensesEur,
}: {
  accounts: AccountOption[];
  avgEssentialMonthlyExpensesEur: number | null;
}) {
  const [open, setOpen] = useState(false);

  if (avgEssentialMonthlyExpensesEur === null) return null;

  const targetAmount = Math.round(avgEssentialMonthlyExpensesEur * EMERGENCY_FUND_DEFAULT_MONTHS);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ShieldCheck />
        Plantilla: fondo de emergencia
      </Button>
      <GoalDialog
        accounts={accounts}
        open={open}
        onOpenChange={setOpen}
        initialValues={{
          name: "Fondo de emergencia",
          type: "emergency_fund",
          targetAmount,
          monthsOfExpenses: EMERGENCY_FUND_DEFAULT_MONTHS,
        }}
      />
    </>
  );
}
