import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/snapshot-net-worth es "pública" solo en el sentido de que no requiere
// sesión de usuario de Supabase (la llama un cron sin navegador) — se
// protege dentro de la propia ruta comprobando CRON_SECRET, no aquí.
const PUBLIC_PATHS = ["/login", "/registro", "/auth", "/api/keepalive", "/api/snapshot-net-worth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No usar getSession() aquí: getUser() revalida el token contra Supabase
  // en vez de fiarse solo de la cookie, que es lo que hace seguro este check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si el usuario tiene MFA (TOTP) activado, signInWithPassword solo deja la
  // sesión en aal1: hay que completar el segundo factor en /mfa-verify antes
  // de dejarle entrar a cualquier ruta protegida. Sin esta comprobación aquí,
  // activar MFA en /ajustes no serviría de nada — el middleware es lo único
  // que de verdad protege las rutas, así que la exigencia de aal2 va aquí.
  let needsMfaVerification = false;
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfaVerification = !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel;
  }

  if (needsMfaVerification && pathname !== "/mfa-verify") {
    const url = request.nextUrl.clone();
    url.pathname = "/mfa-verify";
    return NextResponse.redirect(url);
  }

  if (user && !needsMfaVerification && (pathname === "/login" || pathname === "/registro" || pathname === "/mfa-verify")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
