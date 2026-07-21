import { NextResponse } from "next/server";
import { getCandidatoPorToken, guardarResultado, yaCompletada, contarEventos, getResultado } from "@/lib/db";
import { scoreMemoria, MEMORIA_LIMITE_SEGUNDOS } from "@/lib/tests/memoria";

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

  // Tiempo real total desde que empezó (iniciado_at en la DB).
  const prev = await getResultado(cand.id, "memoria");
  const iniciadoMs = prev?.iniciado_at ? Date.parse(prev.iniciado_at) : null;
  const tiempoTotalSegundos = iniciadoMs ? Math.round((Date.now() - iniciadoMs) / 1000) : null;
  const excedido = tiempoTotalSegundos !== null && tiempoTotalSegundos > MEMORIA_LIMITE_SEGUNDOS;

  const detalle = {
    ...resultado,
    segundosEstudio,
    erroresEstudio,
    tiempoTotalSegundos,
    limiteSegundos: MEMORIA_LIMITE_SEGUNDOS,
    excedido,
    eventosSospechosos: eventos,
  };

  await guardarResultado({
    candidatoId: cand.id,
    tipo: "memoria",
    puntaje: resultado.puntaje,
    detalle,
    respuestas,
  });

  return NextResponse.json({ ok: true, resultado, excedido, tiempoTotalSegundos });
}
