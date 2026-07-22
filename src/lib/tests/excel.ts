/**
 * Corrección de la Prueba de Excel.
 *
 * El candidato descarga la plantilla vacía, la resuelve en Excel (usando
 * las fórmulas BUSCARV/SUMA/SI/SUMAR.SI.CONJUNTO) y sube el archivo.
 * Acá comparamos, celda por celda de la hoja "A resolver":
 *   - el RESULTADO (valor calculado) contra la clave, y
 *   - que se haya usado la FÓRMULA esperada (no valores tipeados a mano).
 *
 * Los nombres de función en el XML de un .xlsx SIEMPRE se guardan en inglés
 * (VLOOKUP, SUMIFS, IF, SUM) aunque Excel esté en español, así que chequeamos
 * esos tokens.
 */

export const EXCEL_SHEET = "A resolver";

/** Tiempo máximo de la prueba de Excel, en segundos (25 minutos). */
export const EXCEL_LIMITE_SEGUNDOS = 25 * 60;

export interface CellData {
  value: number | string | boolean | null;
  formula: string | null;
}

type Expect = {
  coord: string;
  /** valor esperado */
  value: number | string;
  /** función(es) que deberían aparecer en la fórmula (cualquiera cuenta) */
  fns: string[];
  /** etiqueta legible del bloque */
  grupo: string;
};

// Clave de respuestas (derivada del archivo resuelto provisto).
export const EXCEL_KEY: Expect[] = [
  // Columna E: precio unitario con BUSCARV a "Precios Cuadros x Medida"
  { coord: "E3", value: 620, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E4", value: 715, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E5", value: 715, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E6", value: 1245, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E7", value: 1530, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E8", value: 2050, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E9", value: 715, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E10", value: 1010, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E11", value: 1245, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },
  { coord: "E12", value: 1530, fns: ["VLOOKUP"], grupo: "E: $ x unidad (BUSCARV)" },

  // Columna F: total = E * D * (Uni x Caja con BUSCARV a "Base de Datos Codigos")
  { coord: "F3", value: 19840, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F4", value: 34320, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F5", value: 45760, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F6", value: 119520, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F7", value: 97920, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F8", value: 262400, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F9", value: 22880, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F10", value: 60600, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F11", value: 79680, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },
  { coord: "F12", value: 48960, fns: ["VLOOKUP"], grupo: "F: $ Total Pedido (BUSCARV)" },

  // J6: total pedido con descuento = SUMA(F3:F12)*(1-J3)
  { coord: "J6", value: 554316, fns: ["SUM"], grupo: "J6: Total con descuento (SUMA)" },

  // J7 / J8: SI de límites de crédito
  { coord: "J7", value: "Pedido Aceptado", fns: ["IF"], grupo: "J7/J8: Límite crédito (SI)" },
  { coord: "J8", value: "Pedido Rechazado", fns: ["IF"], grupo: "J7/J8: Límite crédito (SI)" },

  // N3:N8: cajas por medida con SUMAR.SI.CONJUNTO
  { coord: "N3", value: 2, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
  { coord: "N4", value: 9, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
  { coord: "N5", value: 3, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
  { coord: "N6", value: 10, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
  { coord: "N7", value: 6, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
  { coord: "N8", value: 8, fns: ["SUMIFS"], grupo: "N: Cajas x medida (SUMAR.SI.CONJUNTO)" },
];

// Suma de F3:F12 sin descuento (para detectar si aplicaron o no el descuento).
const TOTAL_SIN_DESCUENTO = 791880;
const TOTAL_CON_DESCUENTO = 554316;

function norm(s: string): string {
  return s.toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function valorOk(esperado: number | string, real: CellData["value"]): boolean {
  if (real === null || real === undefined) return false;
  if (typeof esperado === "number") {
    const n = typeof real === "number" ? real : parseFloat(String(real).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) && Math.abs(n - esperado) < 0.5;
  }
  return norm(String(real)) === norm(esperado);
}

function limpiar(f: string | null): string {
  return (f || "").replace(/^\s*[=+]+/, "").trim();
}

/** Extrae los argumentos de primer nivel de la primera aparición de `fn(...)`. */
function argsDe(formula: string | null, fn: string): string[] | null {
  if (!formula) return null;
  const up = formula.toUpperCase();
  const i = up.indexOf(fn.toUpperCase() + "(");
  if (i < 0) return null;
  const start = i + fn.length + 1;
  let depth = 0;
  let cur = "";
  const args: string[] = [];
  for (let j = start; j < formula.length; j++) {
    const ch = formula[j];
    if (ch === "(") { depth++; cur += ch; }
    else if (ch === ")") { if (depth === 0) { args.push(cur); break; } depth--; cur += ch; }
    else if (ch === "," && depth === 0) { args.push(cur); cur = ""; }
    else cur += ch;
  }
  return args.map((s) => s.trim());
}

function sinHoja(rango: string): string {
  const i = rango.lastIndexOf("!");
  return (i >= 0 ? rango.slice(i + 1) : rango).trim();
}

function hojaDe(rango: string): string {
  const m = rango.match(/^'?([^'!]+)'?!/);
  return m ? m[1].toLowerCase() : "";
}

// Clasifica la COMPOSICIÓN de un rango (ignora la variación natural de fila):
//  - "columnas": usa columnas enteras (B:C, $A:$E)
//  - "fijas": rango de celdas con $ (celdas fijadas)
//  - "relativas": rango de celdas sin fijar
type Estilo = "columnas" | "fijas" | "relativas" | "otro";
function estiloRango(rango: string): Estilo {
  const r = sinHoja(rango);
  if (/^\$?[A-Za-z]+:\$?[A-Za-z]+$/.test(r)) return "columnas";
  if (/[A-Za-z]+\d/.test(r)) return r.includes("$") ? "fijas" : "relativas";
  return "otro";
}

export interface Categoria {
  clave: "buscarv" | "si" | "sumifs";
  nombre: string;
  pts: number;
  max: number;
  nivel: string;
}

export interface ResultadoExcel {
  puntaje: number; // 0..10
  categorias: Categoria[];
  celdasMal: { coord: string; esperado: number | string; obtenido: CellData["value"] }[];
}

// ---- +BUSCARV (máx 3): columnas E y F ----
function scoreBuscarv(cells: Record<string, CellData>): Categoria {
  const c = (co: string) => cells[co] ?? { value: null, formula: null };
  const eArgs = argsDe(c("E3").formula, "VLOOKUP");
  const fArgs = argsDe(c("F3").formula, "VLOOKUP");
  const ePresent = !!eArgs;
  const fPresent = !!fArgs;
  const base = { clave: "buscarv" as const, nombre: "+BUSCARV", max: 3 };

  if (!ePresent && !fPresent) return { ...base, pts: 0, nivel: "No realizado" };

  const eCoords = ["E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11", "E12"];
  const fCoords = ["F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];
  const val = (co: string) => EXCEL_KEY.find((k) => k.coord === co)?.value ?? 0;
  const eOk = eCoords.every((co) => valorOk(val(co), c(co).value));
  const fOk = fCoords.every((co) => valorOk(val(co), c(co).value));

  const eHojaOk = ePresent ? hojaDe(eArgs![1] || "").includes("precio") : true;
  const fHojaOk = fPresent ? /codigo|base/.test(hojaDe(fArgs![1] || "")) : true;

  const eEst = ePresent ? estiloRango(eArgs![1] || "") : "otro";
  const fEst = fPresent ? estiloRango(fArgs![1] || "") : "otro";
  const columnas = eEst === "columnas" && fEst === "columnas";

  if (eOk && fOk) {
    if (columnas) return { ...base, pts: 3, nivel: "Realizado correctamente" };
    return { ...base, pts: 2.5, nivel: "Correcto, sin tomar columnas pero fijó celdas" };
  }
  if ((ePresent && !eHojaOk) || (fPresent && !fHojaOk)) {
    return { ...base, pts: 2, nivel: "Agarró mal la matriz" };
  }
  return { ...base, pts: 1, nivel: "Eligió mal el valor buscado (le dio un valor)" };
}

// ---- +SI (máx 4): total con descuento (J6) + decisión SI (J7/J8) ----
function scoreSi(cells: Record<string, CellData>): Categoria {
  const c = (co: string) => cells[co] ?? { value: null, formula: null };
  const j6f = limpiar(c("J6").formula);
  const j7f = limpiar(c("J7").formula);
  const j8f = limpiar(c("J8").formula);
  const base = { clave: "si" as const, nombre: "+SI", max: 4 };

  const siPresent = /IF\s*\(/i.test(j7f) || /IF\s*\(/i.test(j8f);
  if (!siPresent) return { ...base, pts: 0, nivel: "No realizado" };

  const j6v = Number(c("J6").value);
  const refJ3 = /J\$?3/i.test(j6f) || /J\$?3/i.test(j7f) || /J\$?3/i.test(j8f);
  const descAplicado = Number.isFinite(j6v) && Math.abs(j6v - TOTAL_CON_DESCUENTO) < 1;
  const sinDesc = Number.isFinite(j6v) && Math.abs(j6v - TOTAL_SIN_DESCUENTO) < 1;

  if (descAplicado && refJ3) return { ...base, pts: 4, nivel: "Descuento tomado con celda" };
  if (descAplicado && !refJ3) return { ...base, pts: 2, nivel: "Descuento tomado manualmente" };
  if (sinDesc) return { ...base, pts: 1, nivel: "Realizado sin el descuento" };
  return { ...base, pts: 1, nivel: "Realizado con errores" };
}

// ---- +SUMAR.SI.CONJUNTO (máx 3): N3:N8 ----
function scoreSumifs(cells: Record<string, CellData>): Categoria {
  const c = (co: string) => cells[co] ?? { value: null, formula: null };
  const nCoords = ["N3", "N4", "N5", "N6", "N7", "N8"];
  const base = { clave: "sumifs" as const, nombre: "+SUMAR.SI.CONJUNTO", max: 3 };

  const rep = ["N3", "N4"].map((co) => argsDe(c(co).formula, "SUMIFS")).find(Boolean);
  const present = nCoords.some((co) => /SUMIFS/i.test(limpiar(c(co).formula)));
  if (!present) return { ...base, pts: 0, nivel: "No realizado" };

  const val = (co: string) => EXCEL_KEY.find((k) => k.coord === co)?.value ?? 0;
  const valoresOk = nCoords.every((co) => valorOk(val(co), c(co).value));

  let estilo: Estilo = "otro";
  if (rep && rep.length >= 2) {
    const e0 = estiloRango(rep[0] || "");
    const e1 = estiloRango(rep[1] || "");
    estilo =
      e0 === "columnas" && e1 === "columnas"
        ? "columnas"
        : e0 === "relativas" || e1 === "relativas"
        ? "relativas"
        : e0 === "fijas" || e1 === "fijas"
        ? "fijas"
        : "otro";
  }

  if (valoresOk) {
    if (estilo === "columnas") return { ...base, pts: 3, nivel: "Realizado correctamente" };
    if (estilo === "relativas") return { ...base, pts: 1.5, nivel: "Realizado sin fijar las celdas" };
    return { ...base, pts: 2.5, nivel: "Correcto, sin tomar columnas pero fijó celdas" };
  }
  return { ...base, pts: 1.5, nivel: "Realizado con errores" };
}

export function scoreExcel(cells: Record<string, CellData>): ResultadoExcel {
  const categorias = [scoreBuscarv(cells), scoreSi(cells), scoreSumifs(cells)];
  const puntaje = Math.round(categorias.reduce((a, cat) => a + cat.pts, 0) * 10) / 10;

  const celdasMal = EXCEL_KEY.filter(
    (k) => !valorOk(k.value, (cells[k.coord] ?? { value: null }).value)
  ).map((k) => ({ coord: k.coord, esperado: k.value, obtenido: (cells[k.coord] ?? { value: null }).value }));

  return { puntaje, categorias, celdasMal };
}
