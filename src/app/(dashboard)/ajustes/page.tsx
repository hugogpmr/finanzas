import { MfaEnrollment } from "@/features/security/mfa-enrollment";

export default function AjustesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Seguridad de tu cuenta.</p>
      </div>

      <div className="max-w-md">
        <MfaEnrollment />
      </div>
    </div>
  );
}
