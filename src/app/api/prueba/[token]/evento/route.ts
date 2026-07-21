import { NextResponse } from "next/server";
import { getCandidatoPorToken, logEvento, TipoPrueba } from "@/lib/db";

export const runtime = "nodejs";

const TIPOS: TipoPrueba[] = ["excel", "tipeo", "memoria"];

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false }, { status: 404 });

  const body = await req.json().catch(() => null);
  const evento = (body?.evento || "").toString().slice(0, 60);
  const tipoPrueba: TipoPrueba = TIPOS.includes(body?.tipoPrueba) ? body.tipoPrueba : "memoria";
  if (!evento) return NextResponse.json({ ok: false }, { status: 400 });

  await logEvento({ candidatoId: cand.id, tipoPrueba, evento, meta: body?.meta ?? null });
  return NextResponse.json({ ok: true });
}
