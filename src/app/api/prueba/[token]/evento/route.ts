import { NextResponse } from "next/server";
import { getCandidatoPorToken, logEvento, TipoPrueba } from "@/lib/db";

export const runtime = "nodejs";

const TIPOS: TipoPrueba[] = ["tipeo", "memoria"];

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false }, { status: 404 });

  const body = await req.json().catch(() => null);
  const evento = (body?.evento || "").toString().slice(0, 60);
  // null = fuera de una prueba (ej. dispositivo detectado en la pantalla inicial)
  const tipoPrueba: TipoPrueba | null = TIPOS.includes(body?.tipoPrueba) ? body.tipoPrueba : null;
  if (!evento) return NextResponse.json({ ok: false }, { status: 400 });

  await logEvento({ candidatoId: cand.id, tipoPrueba, evento, meta: body?.meta ?? null });
  return NextResponse.json({ ok: true });
}
