import { NextResponse } from "next/server";
import { getCandidatoPorToken, iniciarPrueba, yaCompletada } from "@/lib/db";
import { MEMORIA_LIMITE_SEGUNDOS } from "@/lib/tests/memoria";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });
  if (await yaCompletada(cand.id, "memoria")) {
    return NextResponse.json({ ok: false, error: "Ya enviada" }, { status: 409 });
  }
  const iniciadoAt = await iniciarPrueba(cand.id, "memoria");
  return NextResponse.json({ ok: true, iniciadoAt, limiteSegundos: MEMORIA_LIMITE_SEGUNDOS });
}
