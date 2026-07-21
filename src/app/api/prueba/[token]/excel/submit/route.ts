import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCandidatoPorToken, guardarResultado, yaCompletada } from "@/lib/db";
import { scoreExcel, EXCEL_SHEET, EXCEL_KEY, CellData } from "@/lib/tests/excel";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 404 });

  if (await yaCompletada(cand.id, "excel")) {
    return NextResponse.json({ ok: false, error: "La prueba de Excel ya fue enviada." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("archivo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Falta el archivo .xlsx" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Archivo demasiado grande" }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(arrayBuf);
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo leer el archivo (¿es .xlsx?)" }, { status: 400 });
  }

  const ws = wb.getWorksheet(EXCEL_SHEET);
  if (!ws) {
    return NextResponse.json(
      { ok: false, error: `No se encontró la hoja "${EXCEL_SHEET}". No modifiques la plantilla.` },
      { status: 400 }
    );
  }

  // Extraer valor y fórmula de cada celda de la clave.
  // `cell.formula` de exceljs resuelve correctamente las fórmulas compartidas
  // (shared formulas), así que lo usamos como fuente de la fórmula.
  const cells: Record<string, CellData> = {};
  for (const exp of EXCEL_KEY) {
    const cell = ws.getCell(exp.coord);
    let value: CellData["value"] = null;

    const v = cell.value as unknown;
    if (v !== null && typeof v === "object" && "result" in (v as object)) {
      const r = (v as { result?: unknown }).result;
      value = typeof r === "number" || typeof r === "string" || typeof r === "boolean" ? r : null;
    } else if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      value = v;
    }

    const f = (cell as { formula?: unknown }).formula;
    const formula = typeof f === "string" ? f : null;

    cells[exp.coord] = { value, formula };
  }

  const resultado = scoreExcel(cells);

  await guardarResultado({
    candidatoId: cand.id,
    tipo: "excel",
    puntaje: resultado.puntaje,
    detalle: resultado,
    respuestas: { archivo: file.name, tamanio: file.size },
  });

  return NextResponse.json({ ok: true, resultado });
}
