import { getSupabaseAdmin } from "./supabase";
import crypto from "crypto";

export type TipoPrueba = "excel" | "tipeo" | "memoria";

export interface Candidato {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  token: string;
  codigo: string | null;
  estado: string;
  created_at: string;
}

export interface Resultado {
  id: string;
  candidato_id: string;
  tipo: TipoPrueba;
  puntaje: number | null;
  puntaje_max: number;
  detalle: unknown;
  respuestas: unknown;
  estado: string;
  iniciado_at: string | null;
  enviado_at: string | null;
  created_at: string;
}

export function nuevoToken(): string {
  // URL-safe, largo y difícil de adivinar (es la credencial fuerte del link)
  return crypto.randomBytes(24).toString("hex");
}

export function nuevoCodigo(): string {
  // código de 6 dígitos (segundo factor, se pasa junto al link)
  return String(crypto.randomInt(100000, 1000000));
}

export async function crearCandidato(input: {
  nombre: string;
  email?: string | null;
  sector?: string | null;
}): Promise<Candidato> {
  const supabase = getSupabaseAdmin();
  const token = nuevoToken();
  const codigo = nuevoCodigo();
  const { data, error } = await supabase
    .from("pe_candidatos")
    .insert({
      nombre: input.nombre,
      email: input.email ?? null,
      sector: input.sector ?? null,
      token,
      codigo,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Candidato;
}

export async function listarCandidatos(): Promise<
  (Candidato & { resultados: Resultado[] })[]
> {
  const supabase = getSupabaseAdmin();
  const { data: candidatos, error } = await supabase
    .from("pe_candidatos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: resultados, error: e2 } = await supabase.from("pe_resultados").select("*");
  if (e2) throw new Error(e2.message);

  const porCand = new Map<string, Resultado[]>();
  for (const r of (resultados ?? []) as Resultado[]) {
    if (!porCand.has(r.candidato_id)) porCand.set(r.candidato_id, []);
    porCand.get(r.candidato_id)!.push(r);
  }
  return ((candidatos ?? []) as Candidato[]).map((c) => ({
    ...c,
    resultados: porCand.get(c.id) ?? [],
  }));
}

export async function getCandidatoPorToken(token: string): Promise<Candidato | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pe_candidatos")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Candidato) ?? null;
}

export async function getResultado(
  candidatoId: string,
  tipo: TipoPrueba
): Promise<Resultado | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pe_resultados")
    .select("*")
    .eq("candidato_id", candidatoId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Resultado) ?? null;
}

/**
 * Marca el inicio de una prueba (para el cronómetro). Si ya estaba iniciada,
 * devuelve el iniciado_at existente (no se puede reiniciar el reloj).
 */
export async function iniciarPrueba(
  candidatoId: string,
  tipo: TipoPrueba
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const existente = await getResultado(candidatoId, tipo);
  if (existente?.iniciado_at) return existente.iniciado_at;

  const iniciado = new Date().toISOString();
  const { error } = await supabase.from("pe_resultados").upsert(
    { candidato_id: candidatoId, tipo, iniciado_at: iniciado, estado: "en_progreso" },
    { onConflict: "candidato_id,tipo" }
  );
  if (error) throw new Error(error.message);
  return iniciado;
}

export async function getResultados(candidatoId: string): Promise<Resultado[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pe_resultados")
    .select("*")
    .eq("candidato_id", candidatoId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Resultado[];
}

/** Guarda (o reemplaza) el resultado de una prueba para un candidato. */
export async function guardarResultado(input: {
  candidatoId: string;
  tipo: TipoPrueba;
  puntaje: number;
  detalle: unknown;
  respuestas: unknown;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("pe_resultados").upsert(
    {
      candidato_id: input.candidatoId,
      tipo: input.tipo,
      puntaje: input.puntaje,
      detalle: input.detalle as never,
      respuestas: input.respuestas as never,
      estado: "completada",
      enviado_at: new Date().toISOString(),
    },
    { onConflict: "candidato_id,tipo" }
  );
  if (error) throw new Error(error.message);

  // Si ya completó las 3, marcar candidato como completada.
  const res = await getResultados(input.candidatoId);
  const completas = new Set(res.filter((r) => r.estado === "completada").map((r) => r.tipo));
  const estado = completas.size >= 3 ? "completada" : "en_progreso";
  await supabase.from("pe_candidatos").update({ estado }).eq("id", input.candidatoId);
}

export async function yaCompletada(candidatoId: string, tipo: TipoPrueba): Promise<boolean> {
  const res = await getResultados(candidatoId);
  return res.some((r) => r.tipo === tipo && r.estado === "completada");
}

export async function logEvento(input: {
  candidatoId: string;
  tipoPrueba: TipoPrueba;
  evento: string;
  meta?: unknown;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("pe_eventos").insert({
    candidato_id: input.candidatoId,
    tipo_prueba: input.tipoPrueba,
    evento: input.evento,
    meta: (input.meta ?? null) as never,
  });
}

export async function contarEventos(
  candidatoId: string
): Promise<Record<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pe_eventos")
    .select("evento")
    .eq("candidato_id", candidatoId);
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { evento: string }[]) {
    out[row.evento] = (out[row.evento] ?? 0) + 1;
  }
  return out;
}
