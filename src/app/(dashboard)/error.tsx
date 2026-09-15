"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Límite de error de Next.js para todo el grupo (dashboard): si una página o
// alguno de sus Server Components lanza, esto se muestra en vez de la
// pantalla de error genérica de Next (o una pantalla en blanco en producción).
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm font-medium">Algo ha ido mal cargando esta página.</p>
      <p className="text-sm text-muted-foreground">
        No se ha perdido ningún dato. Puedes intentarlo de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
