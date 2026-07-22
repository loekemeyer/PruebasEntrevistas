import { NextResponse } from "next/server";
import { getCandidatoPorToken, iniciarSesion } from "@/lib/db";
import { codigoValido, setAccesoCookie } from "@/lib/acceso";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 404 });

  if (!cand.codigo) {
    return NextResponse.json(
      { ok: false, error: "Este acceso no tiene código configurado. Contactá a RRHH." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const codigo = (body?.codigo || "").toString();

  if (!codigoValido(codigo, cand.codigo)) {
    return NextResponse.json({ ok: false, error: "Código incorrecto" }, { status: 401 });
  }

  setAccesoCookie(params.token, cand.id);
  await iniciarSesion(cand.id, cand.sesion_at);
  return NextResponse.json({ ok: true });
}
