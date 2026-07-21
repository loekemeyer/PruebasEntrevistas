/**
 * Prueba de Memoria.
 * Fase 1: el candidato estudia el material el tiempo que quiera (con anti-copia).
 * Fase 2: responde 5 preguntas. Una vez que pasa a las preguntas, no puede volver
 *         al material. Auto-corrección por número exacto y por palabras clave.
 *
 * Se guardan también las respuestas crudas para revisión/ajuste manual del admin.
 */

export const MEMORIA_TIEMPO_SUGERIDO_MIN = 15;

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
  puntaje: number; // 0..100
  preguntas: CorreccionPregunta[];
}

export function scoreMemoria(respuestas: Record<string, string>): ResultadoMemoria {
  const preguntas: CorreccionPregunta[] = [];
  let total = 0;

  for (const q of MEMORIA_PREGUNTAS) {
    const resp = respuestas[q.id] ?? "";
    let puntos = 0;
    let detalle = "";

    if (q.tipo === "numero") {
      const n = extraerNumero(resp);
      if (n === q.numero) {
        puntos = q.peso;
        detalle = `Correcto (${q.numero}).`;
      } else {
        detalle = `Esperado ${q.numero}, respondió "${resp}".`;
      }
    } else if (q.tipo === "keywords") {
      const n = norm(resp);
      const grupos = q.keywords ?? [];
      const gruposOk = grupos.filter((alts) => alts.some((k) => n.includes(norm(k))));
      const frac = grupos.length > 0 ? gruposOk.length / grupos.length : 0;
      puntos = Math.round(q.peso * frac);
      detalle = `${gruposOk.length}/${grupos.length} conceptos clave presentes.`;
    } else if (q.tipo === "lista") {
      const n = norm(resp);
      const items = q.items ?? [];
      const nombrados = items.filter((it) => n.includes(norm(it)));
      const frac = items.length > 0 ? nombrados.length / items.length : 0;
      puntos = Math.round(q.peso * frac);
      detalle = `Nombró ${nombrados.length}/${items.length}: ${nombrados.join(", ") || "—"}.`;
    }

    total += puntos;
    preguntas.push({ id: q.id, texto: q.texto, respuesta: resp, puntos, peso: q.peso, detalle });
  }

  return { puntaje: Math.round(total), preguntas };
}
