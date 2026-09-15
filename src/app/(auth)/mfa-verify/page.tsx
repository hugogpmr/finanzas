"use client";

import { useActionState } from "react";
import { verifyMfaCode, logout } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MfaVerifyPage() {
  const [state, action, pending] = useActionState(verifyMfaCode, undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>Introduce el código de 6 dígitos de tu app de autenticación.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Verificando..." : "Verificar"}
          </Button>
        </form>
        <form action={logout} className="mt-4">
          <Button variant="link" className="h-auto p-0 text-sm text-muted-foreground" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
