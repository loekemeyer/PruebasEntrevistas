import { redirect } from "next/navigation";
import { getCandidatoPorToken, yaCompletada, getResultado } from "@/lib/db";
import { tieneAcceso } from "@/lib/acceso";
import MemoriaTest from "@/components/tests/MemoriaTest";
import YaEnviada from "@/components/tests/YaEnviada";
import {
  MEMORIA_MATERIAL,
  MEMORIA_PREGUNTAS,
  MEMORIA_TIEMPO_SUGERIDO_MIN,
  MEMORIA_LIMITE_SEGUNDOS,
} from "@/lib/tests/memoria";

export const dynamic = "force-dynamic";

export default async function MemoriaPage({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return <YaEnviada token={params.token} titulo="Link inválido" invalido />;
  if (!tieneAcceso(params.token, cand.id)) redirect(`/prueba/${params.token}`);
  if (await yaCompletada(cand.id, "memoria"))
    return <YaEnviada token={params.token} titulo="Prueba de Memoria" />;

  // Solo enviamos el enunciado de las preguntas (sin respuestas/keys).
  const preguntas = MEMORIA_PREGUNTAS.map((q) => ({ id: q.id, texto: q.texto, tipo: q.tipo }));
  const prev = await getResultado(cand.id, "memoria");

  return (
    <MemoriaTest
      token={params.token}
      nombre={cand.nombre}
      email={cand.email || ""}
      material={MEMORIA_MATERIAL}
      preguntas={preguntas}
      tiempoSugeridoMin={MEMORIA_TIEMPO_SUGERIDO_MIN}
      limiteSegundos={MEMORIA_LIMITE_SEGUNDOS}
      iniciadoAtInicial={prev?.iniciado_at ?? null}
    />
  );
}
