"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | undefined;

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function login(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 12) {
    return { error: "La contraseña debe tener al menos 12 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Ya existe una cuenta con ese email." };
    }
    return { error: error.message };
  }

  return {
    success: "Te hemos enviado un email para confirmar tu cuenta. Revisa tu bandeja de entrada.",
  };
}

export async function verifyMfaCode(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length !== 6) {
    return { error: "El código debe tener 6 dígitos." };
  }

  const supabase = await createClient();
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");

  if (factorsError || !factor) {
    return { error: "No se encontró ningún factor de verificación activo." };
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  });
  if (challengeError || !challenge) {
    return { error: challengeError?.message ?? "No se pudo iniciar la verificación." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return { error: "Código incorrecto. Revisa la hora de tu móvil e inténtalo de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
