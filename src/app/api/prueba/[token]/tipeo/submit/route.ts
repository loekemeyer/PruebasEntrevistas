import { NextResponse } from "next/server";
import { getCandidatoPorToken, guardarResultado, yaCompletada } from "@/lib/db";
import { scoreTipeo } from "@/lib/tests/tipeo";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });
  if (await yaCompletada(cand.id, "tipeo")) {
    return NextResponse.json({ ok: false, error: "La prueba de Tipeo ya fue enviada." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const tipeado = typeof body?.tipeado === "string" ? body.tipeado : "";
  const segundos = Number(body?.segundos) || 60;

  const resultado = scoreTipeo({ tipeado, segundos });

  await guardarResultado({
    candidatoId: cand.id,
    tipo: "tipeo",
    puntaje: resultado.puntaje,
    detalle: resultado,
    respuestas: { tipeado, segundos },
  });

  return NextResponse.json({ ok: true, resultado });
}
