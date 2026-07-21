import { NextResponse } from "next/server";
import { getCandidatoPorToken, iniciarPrueba, yaCompletada } from "@/lib/db";
import { EXCEL_LIMITE_SEGUNDOS } from "@/lib/tests/excel";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });
  if (await yaCompletada(cand.id, "excel")) {
    return NextResponse.json({ ok: false, error: "Ya enviada" }, { status: 409 });
  }
  const iniciadoAt = await iniciarPrueba(cand.id, "excel");
  return NextResponse.json({ ok: true, iniciadoAt, limiteSegundos: EXCEL_LIMITE_SEGUNDOS });
}
