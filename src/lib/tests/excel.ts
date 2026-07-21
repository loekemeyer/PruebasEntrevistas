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

// Peso del resultado vs. el uso de fórmula en el puntaje final.
const PESO_VALOR = 0.7;
const PESO_FORMULA = 0.3;

function norm(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // saca acentos
}

function valorOk(esperado: number | string, real: CellData["value"]): boolean {
  if (real === null || real === undefined) return false;
  if (typeof esperado === "number") {
    const n = typeof real === "number" ? real : parseFloat(String(real).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) && Math.abs(n - esperado) < 0.5;
  }
  return norm(String(real)) === norm(esperado);
}

function formulaOk(fns: string[], formula: string | null): boolean {
  if (!formula) return false;
  const up = formula.toUpperCase();
  return fns.some((f) => up.includes(f.toUpperCase()));
}

export interface ItemCorreccion {
  coord: string;
  grupo: string;
  esperado: number | string;
  obtenido: CellData["value"];
  valorOk: boolean;
  formulaOk: boolean;
}

export interface ResultadoExcel {
  puntaje: number; // 0..100
  valoresCorrectos: number;
  totalValores: number;
  formulasCorrectas: number;
  totalFormulas: number;
  items: ItemCorreccion[];
  resumenPorGrupo: Record<string, { ok: number; total: number }>;
}

export function scoreExcel(cells: Record<string, CellData>): ResultadoExcel {
  const items: ItemCorreccion[] = [];
  const resumenPorGrupo: Record<string, { ok: number; total: number }> = {};
  let valoresCorrectos = 0;
  let formulasCorrectas = 0;

  for (const exp of EXCEL_KEY) {
    const cell = cells[exp.coord] ?? { value: null, formula: null };
    const vOk = valorOk(exp.value, cell.value);
    const fOk = formulaOk(exp.fns, cell.formula);
    if (vOk) valoresCorrectos++;
    if (fOk) formulasCorrectas++;

    if (!resumenPorGrupo[exp.grupo]) resumenPorGrupo[exp.grupo] = { ok: 0, total: 0 };
    resumenPorGrupo[exp.grupo].total++;
    if (vOk) resumenPorGrupo[exp.grupo].ok++;

    items.push({
      coord: exp.coord,
      grupo: exp.grupo,
      esperado: exp.value,
      obtenido: cell.value,
      valorOk: vOk,
      formulaOk: fOk,
    });
  }

  const totalValores = EXCEL_KEY.length;
  const totalFormulas = EXCEL_KEY.length;
  const puntaje = Math.round(
    (PESO_VALOR * (valoresCorrectos / totalValores) +
      PESO_FORMULA * (formulasCorrectas / totalFormulas)) *
      100
  );

  return {
    puntaje,
    valoresCorrectos,
    totalValores,
    formulasCorrectas,
    totalFormulas,
    items,
    resumenPorGrupo,
  };
}
