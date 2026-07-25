import { NextResponse } from "next/server";
import { getCandidatoPorToken, guardarResultado, yaCompletada } from "@/lib/db";
import { scoreTipeo, TIPEO_SEGUNDOS, ResultadoTipeo } from "@/lib/tests/tipeo";

export const runtime = "nodejs";

type Intento = { tipeado: string; segundos: number };

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });
  if (await yaCompletada(cand.id, "tipeo")) {
    return NextResponse.json({ ok: false, error: "La prueba de Tipeo ya fue enviada." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);

  // Acepta varios intentos (nuevo) o uno solo (compatibilidad).
  const crudos: Intento[] = Array.isArray(body?.intentos)
    ? body.intentos
    : [{ tipeado: body?.tipeado, segundos: body?.segundos }];

  const intentos: Intento[] = crudos.map((it) => ({
    tipeado: typeof it?.tipeado === "string" ? it.tipeado : "",
    segundos: Number(it?.segundos) || TIPEO_SEGUNDOS,
  }));

  // Se puntúa cada intento y nos quedamos con el mejor (mayor puntaje;
  // desempate por PPM neto = "mejor tiempo").
  const evaluados = intentos.map((it) => ({ ...it, resultado: scoreTipeo(it) }));
  const esMejor = (a: ResultadoTipeo, b: ResultadoTipeo) =>
    b.puntaje > a.puntaje || (b.puntaje === a.puntaje && b.ppmNeto > a.ppmNeto);
  let mejorIdx = 0;
  for (let i = 1; i < evaluados.length; i++) {
    if (esMejor(evaluados[mejorIdx].resultado, evaluados[i].resultado)) mejorIdx = i;
  }
  const mejor = evaluados[mejorIdx];

  const detalle = {
    ...mejor.resultado,
    intentoElegido: mejorIdx + 1,
    intentos: evaluados.map((e, i) => ({ intento: i + 1, ...e.resultado })),
  };

  await guardarResultado({
    candidatoId: cand.id,
    tipo: "tipeo",
    puntaje: mejor.resultado.puntaje,
    detalle,
    respuestas: { intentos },
  });

  return NextResponse.json({ ok: true, resultado: mejor.resultado });
}
