import { NextResponse } from "next/server";
import { getCandidatoPorToken, guardarResultado, yaCompletada, contarEventos } from "@/lib/db";
import { scoreMemoria } from "@/lib/tests/memoria";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });
  if (await yaCompletada(cand.id, "memoria")) {
    return NextResponse.json({ ok: false, error: "La prueba de Memoria ya fue enviada." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const respuestas: Record<string, string> = body?.respuestas ?? {};
  const segundosEstudio = Number(body?.segundosEstudio) || null;
  const erroresEstudio = Number(body?.errores) || 0;

  const resultado = scoreMemoria(respuestas);
  const eventos = await contarEventos(cand.id);

  await guardarResultado({
    candidatoId: cand.id,
    tipo: "memoria",
    puntaje: resultado.puntaje,
    detalle: { ...resultado, segundosEstudio, erroresEstudio, eventosSospechosos: eventos },
    respuestas,
  });

  return NextResponse.json({ ok: true, resultado });
}
