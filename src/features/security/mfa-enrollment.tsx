"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "loading" | "disabled" | "enrolling" | "enabled";

// Verificación en dos pasos (TOTP) vía Supabase Auth: la app nunca genera ni
// guarda el secreto, solo llama a supabase.auth.mfa.* — todo el estado del
// factor vive en Supabase. Flujo: enroll() genera QR+secreto → el usuario lo
// escanea con su app (Google Authenticator, Authy...) → challenge()+verify()
// con el código de 6 dígitos confirma que lo configuró bien antes de
// activarlo de verdad.
export function MfaEnrollment() {
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) {
        toast.error(error.message);
        setStatus("disabled");
        return;
      }
      const verified = data?.totp.find((f) => f.status === "verified");
      setStatus(verified ? "enabled" : "disabled");
    });
  }, []);

  async function startEnrollment() {
    setBusy(true);
    const supabase = createClient();

    // Si quedó un factor sin verificar de un intento anterior, se retira
    // antes de crear uno nuevo (Supabase no permite reenrollar por encima).
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.totp.find((f) => f.status !== "verified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "No se pudo iniciar la activación.");
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatus("enrolling");
  }

  async function confirmEnrollment() {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setBusy(false);
      toast.error(challengeError?.message ?? "No se pudo verificar el código.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);

    if (verifyError) {
      toast.error("Código incorrecto. Revisa la hora de tu móvil e inténtalo de nuevo.");
      return;
    }

    toast.success("Verificación en dos pasos activada.");
    setStatus("enabled");
    setCode("");
  }

  async function disableMfa() {
    if (!confirm("¿Desactivar la verificación en dos pasos?")) return;
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp.find((f) => f.status === "verified");

    if (verified) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (error) toast.error(error.message);
      else {
        toast.success("Verificación en dos pasos desactivada.");
        setStatus("disabled");
      }
    }
    setBusy(false);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>
          Añade una capa extra de seguridad con una app como Google Authenticator o Authy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status === "loading" && <p className="text-sm text-muted-foreground">Cargando...</p>}

        {status === "disabled" && (
          <Button onClick={startEnrollment} disabled={busy} className="w-fit">
            Activar verificación en dos pasos
          </Button>
        )}

        {status === "enrolling" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Escanea este código QR con tu app de autenticación, o introduce el código manual.
            </p>
            {qrCode && (
              // eslint-disable-next-line @next/next/no-img-element -- SVG data URI de Supabase, no una imagen optimizable por next/image.
              <img src={qrCode} alt="Código QR para activar la verificación en dos pasos" className="size-48" />
            )}
            {secret && (
              <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{secret}</p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStatus("disabled")} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={confirmEnrollment} disabled={busy || code.length !== 6}>
                Verificar y activar
              </Button>
            </div>
          </div>
        )}

        {status === "enabled" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-500">Activada.</p>
            <Button variant="outline" onClick={disableMfa} disabled={busy} className="w-fit">
              Desactivar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
