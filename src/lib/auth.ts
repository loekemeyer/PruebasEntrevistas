import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Autenticación de admin, minimalista y sin dependencias externas.
 * Una sola password (ADMIN_PASSWORD). La cookie guarda un HMAC derivado de
 * esa password, imposible de forjar sin conocerla. Pensado para reemplazarse
 * por el auth del proyecto principal al hacer el merge.
 */
const COOKIE_NAME = "pe_admin";

function adminToken(): string {
  const pass = process.env.ADMIN_PASSWORD || "";
  return crypto.createHmac("sha256", pass).update("admin-session-v1").digest("hex");
}

export function checkPassword(input: string): boolean {
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) return false;
  // comparación en tiempo constante
  const a = Buffer.from(input);
  const b = Buffer.from(pass);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function setAdminCookie() {
  cookies().set(COOKIE_NAME, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
}

export function clearAdminCookie() {
  cookies().delete(COOKIE_NAME);
}

export function isAdmin(): boolean {
  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return false;
  const expected = adminToken();
  const a = Buffer.from(c);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
