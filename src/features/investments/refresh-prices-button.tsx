"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPrices } from "./actions";
import { Button } from "@/components/ui/button";

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await refreshPrices();
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(
          `Precios actualizados: ${result.updated ?? 0}${
            result.skipped ? ` (${result.skipped} sin ticker o sin dato disponible)` : ""
          }.`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={isPending ? "animate-spin" : ""} />
        {isPending ? "Actualizando..." : "Actualizar precios"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
