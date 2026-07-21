import { getCandidatoPorToken } from "@/lib/db";
import { PLANTILLA_EXCEL_B64, PLANTILLA_EXCEL_NOMBRE } from "@/lib/tests/plantilla-excel";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return new Response("No autorizado", { status: 404 });

  const buf = Buffer.from(PLANTILLA_EXCEL_B64, "base64");
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${PLANTILLA_EXCEL_NOMBRE}"`,
      "Content-Length": String(buf.length),
    },
  });
}
