import { getCandidatoPorToken, yaCompletada } from "@/lib/db";
import MemoriaTest from "@/components/tests/MemoriaTest";
import YaEnviada from "@/components/tests/YaEnviada";
import { MEMORIA_TEXTO_ESTUDIO, MEMORIA_PREGUNTAS, MEMORIA_TIEMPO_SUGERIDO_MIN } from "@/lib/tests/memoria";

export const dynamic = "force-dynamic";

export default async function MemoriaPage({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return <YaEnviada token={params.token} titulo="Link inválido" invalido />;
  if (await yaCompletada(cand.id, "memoria"))
    return <YaEnviada token={params.token} titulo="Prueba de Memoria" />;

  // Solo enviamos el enunciado de las preguntas (sin respuestas/keys).
  const preguntas = MEMORIA_PREGUNTAS.map((q) => ({ id: q.id, texto: q.texto, tipo: q.tipo }));

  return (
    <MemoriaTest
      token={params.token}
      nombre={cand.nombre}
      email={cand.email || ""}
      textoEstudio={MEMORIA_TEXTO_ESTUDIO}
      preguntas={preguntas}
      tiempoSugeridoMin={MEMORIA_TIEMPO_SUGERIDO_MIN}
    />
  );
}
