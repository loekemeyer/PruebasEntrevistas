import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { crearCandidato, listarCandidatos } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ ok: false }, { status: 401 });
  const candidatos = await listarCandidatos();
  return NextResponse.json({ ok: true, candidatos });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre || "").trim();
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "Falta el nombre" }, { status: 400 });
  }
  const candidato = await crearCandidato({
    nombre,
    email: (body?.email || "").trim() || null,
    sector: (body?.sector || "").trim() || null,
  });
  return NextResponse.json({ ok: true, candidato });
}
