"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function subscribe() {
  return () => {};
}

// El servidor no sabe qué tema tiene activo el sistema del usuario (siempre
// "system" en el primer render), así que hay que esperar a que el cliente
// monte antes de decidir el icono — igual que src/hooks/use-mobile.ts, con
// useSyncExternalStore en vez de setState dentro de un efecto (evita el
// warning de cascading renders, ver commit 46fd5d6).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Cambiar tema claro/oscuro"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
