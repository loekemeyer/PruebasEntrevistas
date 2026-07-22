import { redirect } from "next/navigation";
import { getCandidatoPorToken, yaCompletada } from "@/lib/db";
import { tieneAcceso } from "@/lib/acceso";
import TipeoTest from "@/components/tests/TipeoTest";
import YaEnviada from "@/components/tests/YaEnviada";
import { TIPEO_TEXTO, TIPEO_SEGUNDOS } from "@/lib/tests/tipeo";

export const dynamic = "force-dynamic";

export default async function TipeoPage({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return <YaEnviada token={params.token} titulo="Link inválido" invalido />;
  if (!tieneAcceso(params.token, cand.id)) redirect(`/prueba/${params.token}`);
  if (await yaCompletada(cand.id, "tipeo"))
    return <YaEnviada token={params.token} titulo="Prueba de Tipeo" />;
  return <TipeoTest token={params.token} texto={TIPEO_TEXTO} segundos={TIPEO_SEGUNDOS} />;
}
