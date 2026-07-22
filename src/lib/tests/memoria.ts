/**
 * Prueba de Memoria.
 * Fase 1: el candidato estudia el material el tiempo que quiera (con anti-copia).
 * Fase 2: responde 5 preguntas. Una vez que pasa a las preguntas, no puede volver
 *         al material. Auto-corrección por número exacto y por palabras clave.
 *
 * Se guardan también las respuestas crudas para revisión/ajuste manual del admin.
 */

export const MEMORIA_TIEMPO_SUGERIDO_MIN = 15;

/** Tiempo máximo de la prueba de Memoria, en segundos (15 minutos). */
export const MEMORIA_LIMITE_SEGUNDOS = 15 * 60;

/**
 * Texto que el candidato debe LEER y TIPEAR para estudiar (fase de estudio).
 * Se revela de a poco a medida que tipea (letra por letra, con look-ahead corto),
 * así no se puede copiar/seleccionar ni capturar todo de un screenshot.
 * Sin acentos, para facilitar el tipeo. Contiene todos los datos que se preguntan.
 */
export const MEMORIA_TEXTO_ESTUDIO =
  "Pedidos Insumos (Logistica). " +
  "Tipos de Orden de compra: Orden de compra Insumos, Orden de compra Articulos Terminados, " +
  "y Orden de compra Talleristas Virgilio. " +
  "La Orden de compra de Insumos incluye: Flejes, Cajas, Cartones, Bolsas Plasticas, " +
  "Partes Plasticas, Remaches y Bombillas. " +
  "Seguimiento de fecha de entrega: una vez enviada la orden de compra, en base a la prioridad " +
  "se debe solicitar que se confirme una fecha de entrega aproximada. " +
  "Dentro del plazo de 3 dias antes de que se cumpla la fecha de entrega, se debe consultar al " +
  "proveedor la confirmacion de dicha fecha, y reprogramarla en caso de que surja un problema " +
  "con el proceso de produccion, y dejarlo sentado en la orden de compra fisica y en el resumen digital.";

/** Material de estudio (texto: Pedidos Insumos - Logística). */
export const MEMORIA_MATERIAL = {
  titulo: "Pedidos Insumos (Logística)",
  bloques: [
    {
      subtitulo: "Tipos de Orden de compra",
      items: [
        "Orden de compra Insumos",
        "Orden de compra Artículos Terminados",
        "Orden de compra Talleristas Virgilio",
      ],
    },
    {
      subtitulo: "Orden de compra Insumos incluye",
      items: [
        "Flejes",
        "Cajas",
        "Cartones",
        "Bolsas Plásticas",
        "Partes Plásticas",
        "Remaches",
        "Bombillas",
      ],
    },
  ],
  seguimiento: [
    "Seguimiento de fecha de entrega: una vez enviada la orden de compra, en base a la " +
      "prioridad se debe solicitar que se confirme una fecha de entrega aproximada.",
    "Dentro del plazo de 3 días antes de que se cumpla la fecha de entrega, se debe " +
      "consultar al proveedor la confirmación de dicha fecha, y/o reprogramarla en caso " +
      "de que surja un problema con el proceso de producción, y dejarlo sentado en la " +
      "orden de compra física y en el resumen digital.",
  ],
};

export type TipoPregunta = "numero" | "keywords" | "lista";

export interface Pregunta {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  /** para tipo "numero" */
  numero?: number;
  /** para tipo "keywords": alguna de estas debe aparecer */
  keywords?: string[][]; // grupos AND de alternativas OR: [[a,b],[c]] => (a|b) & (c)
  /** para tipo "lista": items a nombrar */
  items?: string[];
  peso: number; // porcentaje del total
}

export const MEMORIA_PREGUNTAS: Pregunta[] = [
  {
    id: "q1",
    texto: "¿Cuántos tipos de Órdenes de compra hay?",
    tipo: "numero",
    numero: 3,
    peso: 20,
  },
  {
    id: "q2",
    texto: "¿Cuántos tipos de Insumos hay? Nombrá los que recuerdes.",
    tipo: "lista",
    items: [
      "Flejes",
      "Cajas",
      "Cartones",
      "Bolsas Plásticas",
      "Partes Plásticas",
      "Remaches",
      "Bombillas",
    ],
    peso: 20,
  },
  {
    id: "q3",
    texto: "En el seguimiento de fecha de entrega: ¿en base a qué se solicita la fecha de entrega?",
    tipo: "keywords",
    keywords: [["prioridad"]],
    peso: 20,
  },
  {
    id: "q4",
    texto:
      "¿En el plazo de cuántos días antes de la fecha de entrega debemos consultar al proveedor la confirmación?",
    tipo: "numero",
    numero: 3,
    peso: 20,
  },
  {
    id: "q5",
    texto: "¿En qué casos se reprogramaría la fecha de entrega?",
    tipo: "keywords",
    keywords: [["problema", "inconveniente"], ["produccion", "proceso"]],
    peso: 20,
  },
];

function norm(s: string): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function extraerNumero(s: string): number | null {
  const palabras: Record<string, number> = {
    cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };
  const n = norm(s);
  const m = n.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  for (const [p, v] of Object.entries(palabras)) {
    if (new RegExp(`\\b${p}\\b`).test(n)) return v;
  }
  return null;
}

export interface CorreccionPregunta {
  id: string;
  texto: string;
  respuesta: string;
  puntos: number; // sobre `peso`
  peso: number;
  detalle: string;
}

export interface ResultadoMemoria {
  puntaje: number; // 0..10
  preguntas: CorreccionPregunta[];
}

const PESO_PREGUNTA = 2; // 2 puntos por pregunta (5 preguntas = 10)

/**
 * Corrección por pregunta (0, 1 o 2 puntos).
 * Regla general (RRHH): si dan solo el dato/cantidad sin el detalle → 1 punto;
 * con el detalle correcto → 2; nada correcto → 0.
 */
function corregir(id: string, resp: string): { puntos: number; detalle: string } {
  const n = norm(resp);
  const tiene = (...ks: string[]) => ks.some((k) => n.includes(norm(k)));
  const num = extraerNumero(resp);

  if (id === "q1") {
    // 3 tipos: Insumos, Artículos Terminados, Talleristas Virgilio
    let nombres = 0;
    if (tiene("insumo")) nombres++;
    if (tiene("termina")) nombres++; // artículos terminados
    if (tiene("tallerista", "virgilio")) nombres++;
    if (nombres >= 3) return { puntos: 2, detalle: `Nombró los 3 tipos.` };
    if (num === 3 || nombres >= 1) return { puntos: 1, detalle: `Cantidad/parcial (nombró ${nombres}/3).` };
    return { puntos: 0, detalle: "Incorrecto." };
  }

  if (id === "q2") {
    // 7 insumos
    const grupos = ["flej", "caja", "carton", "bolsa", "parte", "remach", "bombill"];
    const nombrados = grupos.filter((g) => n.includes(g)).length;
    if (nombrados >= 6) return { puntos: 2, detalle: `Nombró ${nombrados}/7 insumos.` };
    if (nombrados >= 1 || num === 7) return { puntos: 1, detalle: `Cantidad/parcial (nombró ${nombrados}/7).` };
    return { puntos: 0, detalle: "Incorrecto." };
  }

  if (id === "q3") {
    // en base a la prioridad
    if (tiene("priorid")) return { puntos: 2, detalle: "Correcto (prioridad)." };
    return { puntos: 0, detalle: "No mencionó la prioridad." };
  }

  if (id === "q4") {
    // 3 días antes de que se cumpla la fecha de entrega
    const detalle = tiene("antes", "fecha", "entrega", "cumpl");
    if (num === 3 && detalle) return { puntos: 2, detalle: "Correcto (3 días, con detalle)." };
    if (num === 3) return { puntos: 1, detalle: "Solo la cantidad (3), sin detalle." };
    return { puntos: 0, detalle: "Incorrecto." };
  }

  if (id === "q5") {
    // problema con el proceso de producción
    const problema = tiene("problema", "inconvenient", "surja");
    const produccion = tiene("produccion", "proceso");
    if (problema && produccion) return { puntos: 2, detalle: "Correcto (problema en la producción)." };
    if (problema || produccion) return { puntos: 1, detalle: "Parcial." };
    return { puntos: 0, detalle: "Incorrecto." };
  }

  return { puntos: 0, detalle: "" };
}

export function scoreMemoria(respuestas: Record<string, string>): ResultadoMemoria {
  const preguntas: CorreccionPregunta[] = [];
  let total = 0;

  for (const q of MEMORIA_PREGUNTAS) {
    const resp = respuestas[q.id] ?? "";
    const { puntos, detalle } = corregir(q.id, resp);
    total += puntos;
    preguntas.push({ id: q.id, texto: q.texto, respuesta: resp, puntos, peso: PESO_PREGUNTA, detalle });
  }

  return { puntaje: total, preguntas };
}
