import { getCandidatoPorToken, yaCompletada } from "@/lib/db";
import ExcelTest from "@/components/tests/ExcelTest";
import YaEnviada from "@/components/tests/YaEnviada";

export const dynamic = "force-dynamic";

export default async function ExcelPage({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return <YaEnviada token={params.token} titulo="Link inválido" invalido />;
  if (await yaCompletada(cand.id, "excel"))
    return <YaEnviada token={params.token} titulo="Prueba de Excel" />;
  return <ExcelTest token={params.token} />;
}
