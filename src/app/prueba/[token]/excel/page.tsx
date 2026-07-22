import { redirect } from "next/navigation";
import { getCandidatoPorToken, yaCompletada, getResultado } from "@/lib/db";
import { tieneAcceso } from "@/lib/acceso";
import ExcelTest from "@/components/tests/ExcelTest";
import YaEnviada from "@/components/tests/YaEnviada";
import { EXCEL_LIMITE_SEGUNDOS } from "@/lib/tests/excel";

export const dynamic = "force-dynamic";

export default async function ExcelPage({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) return <YaEnviada token={params.token} titulo="Link inválido" invalido />;
  if (!tieneAcceso(params.token, cand.id)) redirect(`/prueba/${params.token}`);
  if (await yaCompletada(cand.id, "excel"))
    return <YaEnviada token={params.token} titulo="Prueba de Excel" />;

  const prev = await getResultado(cand.id, "excel");
  return (
    <ExcelTest
      token={params.token}
      iniciadoAtInicial={prev?.iniciado_at ?? null}
      limiteSegundos={EXCEL_LIMITE_SEGUNDOS}
    />
  );
}
