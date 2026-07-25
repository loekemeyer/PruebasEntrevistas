import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { eliminarCandidato } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!params.id) return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
  await eliminarCandidato(params.id);
  return NextResponse.json({ ok: true });
}
