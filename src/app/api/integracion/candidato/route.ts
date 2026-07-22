import { NextResponse } from "next/server";
import crypto from "crypto";
import { crearCandidato } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Endpoint de integración para apps externas (ej. Planify / Lectura de CVs).
 * Crea un candidato y devuelve el link + código de 6 dígitos para enviárselo.
 *
 * Auth: header `x-api-key` == process.env.INTEGRACION_API_KEY.
 * Uso previsto: server-to-server (no exponer la API key en un navegador).
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

function apiKeyOk(req: Request): boolean {
  const key = process.env.INTEGRACION_API_KEY || "";
  if (!key) return false;
  const dada = req.headers.get("x-api-key") || "";
  const a = Buffer.from(dada);
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  if (!apiKeyOk(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401, headers: CORS });
  }

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre || "").toString().trim();
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "Falta 'nombre'" }, { status: 400, headers: CORS });
  }

  const candidato = await crearCandidato({
    nombre,
    email: (body?.email || "").toString().trim() || null,
    sector: (body?.sector || "").toString().trim() || null,
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const link = `${base}/prueba/${candidato.token}`;

  return NextResponse.json(
    {
      ok: true,
      nombre: candidato.nombre,
      email: candidato.email,
      sector: candidato.sector,
      token: candidato.token,
      codigo: candidato.codigo,
      link,
    },
    { headers: CORS }
  );
}
