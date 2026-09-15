"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Red de seguridad global (fuera de (dashboard), que ya tiene la suya): solo
// salta si algo revienta antes de llegar a un límite de error más específico.
export default function GlobalError({
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Algo ha ido mal.</p>
      <p className="text-sm text-muted-foreground">No se ha perdido ningún dato.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
