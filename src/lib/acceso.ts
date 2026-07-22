import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Acceso del postulado a su prueba: link único (token) + código de 6 dígitos.
 * Cuando ingresa el código correcto se setea una cookie firmada, con path
 * limitado a /prueba/<token>, así solo habilita las páginas de ese candidato.
 */
function secreto(): string {
  // secreto estable disponible solo en el server
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD || "pe-fallback-secret";
}

function firma(token: string, candidatoId: string): string {
  return crypto.createHmac("sha256", secreto()).update(`acc:${token}:${candidatoId}`).digest("hex");
}

function cookieName(token: string): string {
  return `pe_acc_${token}`;
}

export function setAccesoCookie(token: string, candidatoId: string) {
  cookies().set(cookieName(token), firma(token, candidatoId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/prueba/${token}`,
    maxAge: 60 * 60 * 6, // 6 horas
  });
}

export function tieneAcceso(token: string, candidatoId: string): boolean {
  const val = cookies().get(cookieName(token))?.value;
  if (!val) return false;
  const esperado = firma(token, candidatoId);
  const a = Buffer.from(val);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Compara el código ingresado contra el del candidato (normalizado). */
export function codigoValido(ingresado: string, real: string | null): boolean {
  if (!real) return false;
  const norm = (s: string) => s.replace(/\D/g, "");
  const a = Buffer.from(norm(ingresado));
  const b = Buffer.from(norm(real));
  return a.length === b.length && a.length === 6 && crypto.timingSafeEqual(a, b);
}
