/**
 * Prueba de Tipeo (réplica local del test de 1 minuto).
 * Se mide sobre el texto fijo de abajo. El candidato tipea durante 60s.
 * Métricas:
 *   - PPM bruto  = (caracteres tipeados / 5) / minutos
 *   - Precisión  = caracteres correctos / caracteres tipeados
 *   - PPM neto   = (caracteres correctos / 5) / minutos   (lo que reportamos)
 */

export const TIPEO_SEGUNDOS = 60;

export const TIPEO_TEXTO =
  "La organizacion del trabajo dentro de una empresa requiere atencion constante, " +
  "rapidez en la ejecucion y precision en cada tarea realizada. Cada persona debe " +
  "verificar los datos antes de registrarlos, controlar los tiempos y asegurarse de " +
  "que la informacion sea correcta. Cuando se trabaja con orden, los errores disminuyen " +
  "y el proceso se vuelve mas eficiente. Es importante mantener la concentracion, seguir " +
  "los procedimientos indicados y respetar las prioridades establecidas. La falta de " +
  "control genera demoras, retrabajos y problemas que afectan a todo el equipo. Por eso, " +
  "la responsabilidad individual y el cuidado en los detalles permiten que el sistema " +
  "funcione correctamente y que los resultados sean mejores en cada jornada de trabajo.";

/**
 * Tabla de evaluación (velocidad en PPM neto → puntos sobre 10).
 * Referencia provista por RRHH: 20→4, 30→5, 35→6, 40→7, 45→8, 55→9, 60→10.
 * Por debajo de 20 PPM se interpola lineal de 0 a 4.
 */
const TABLA_VELOCIDAD: [number, number][] = [
  [60, 10],
  [55, 9],
  [45, 8],
  [40, 7],
  [35, 6],
  [30, 5],
  [20, 4],
];

export function velocidadAPuntos(ppm: number): number {
  for (const [v, p] of TABLA_VELOCIDAD) if (ppm >= v) return p;
  return Math.max(0, Math.round((ppm / 20) * 4));
}

export interface EntradaTipeo {
  /** lo que efectivamente tipeó el candidato */
  tipeado: string;
  /** segundos que estuvo tipeando (normalmente 60) */
  segundos: number;
}

export interface ResultadoTipeo {
  puntaje: number; // 0..100
  ppmBruto: number;
  ppmNeto: number;
  precision: number; // 0..100
  caracteresTipeados: number;
  caracteresCorrectos: number;
  errores: number;
  segundos: number;
}

export function scoreTipeo({ tipeado, segundos }: EntradaTipeo): ResultadoTipeo {
  const seg = segundos > 0 ? segundos : TIPEO_SEGUNDOS;
  const minutos = seg / 60;
  const tipeadoLen = tipeado.length;

  // caracteres correctos = coinciden posición a posición con el texto objetivo
  let correctos = 0;
  for (let i = 0; i < tipeadoLen; i++) {
    if (tipeado[i] === TIPEO_TEXTO[i]) correctos++;
  }
  const errores = tipeadoLen - correctos;

  const ppmBruto = minutos > 0 ? tipeadoLen / 5 / minutos : 0;
  const ppmNeto = minutos > 0 ? correctos / 5 / minutos : 0;
  const precision = tipeadoLen > 0 ? (correctos / tipeadoLen) * 100 : 0;

  // Puntaje 0..10 según la tabla de velocidad (sobre PPM neto).
  const puntaje = velocidadAPuntos(ppmNeto);

  return {
    puntaje,
    ppmBruto: Math.round(ppmBruto * 10) / 10,
    ppmNeto: Math.round(ppmNeto * 10) / 10,
    precision: Math.round(precision * 10) / 10,
    caracteresTipeados: tipeadoLen,
    caracteresCorrectos: correctos,
    errores,
    segundos: seg,
  };
}
