import Link from "next/link";
import { getCandidatoPorToken, getResultados } from "@/lib/db";
import { tieneAcceso } from "@/lib/acceso";
import AccesoCodigo from "@/components/tests/AccesoCodigo";
import ContadorSesion from "@/components/tests/ContadorSesion";
import { EXCEL_LIMITE_SEGUNDOS } from "@/lib/tests/excel";
import { TIPEO_SEGUNDOS } from "@/lib/tests/tipeo";
import { MEMORIA_LIMITE_SEGUNDOS } from "@/lib/tests/memoria";

export const dynamic = "force-dynamic";

const TOTAL_SESION_SEGUNDOS = EXCEL_LIMITE_SEGUNDOS + TIPEO_SEGUNDOS + MEMORIA_LIMITE_SEGUNDOS;

const PRUEBAS = [
  { tipo: "excel", nombre: "Prueba de Excel", desc: "Descargás una planilla, la resolvés con fórmulas y la subís.", tiempo: "~25 min" },
  { tipo: "tipeo", nombre: "Prueba de Tipeo", desc: "Copiás un texto durante 1 minuto. Se mide velocidad y precisión.", tiempo: "1 min" },
  { tipo: "memoria", nombre: "Prueba de Memoria", desc: "Estudiás un material y después respondés 5 preguntas.", tiempo: "~15 min" },
] as const;

export default async function PruebaHub({ params }: { params: { token: string } }) {
  const cand = await getCandidatoPorToken(params.token);
  if (!cand) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-bold">Link inválido</h1>
        <p className="text-white/60">Este enlace no es válido o expiró. Contactá a RRHH.</p>
      </main>
    );
  }
  // Segundo factor: código de 6 dígitos
  if (!tieneAcceso(params.token, cand.id)) {
    return <AccesoCodigo token={params.token} nombre={cand.nombre} />;
  }

  const resultados = await getResultados(cand.id);
  const hechas = new Set(resultados.filter((r) => r.estado === "completada").map((r) => r.tipo));

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-8 mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hola, {cand.nombre.split(" ")[0]} 👋</h1>
          <p className="mt-2 text-white/60">
            Tenés 3 pruebas para completar. Podés hacerlas en el orden que quieras. Una vez que
            enviás una prueba, no se puede rehacer.
          </p>
        </div>
        {cand.sesion_at && (
          <ContadorSesion sesionAt={cand.sesion_at} totalSegundos={TOTAL_SESION_SEGUNDOS} />
        )}
      </header>

      <div className="space-y-4">
        {PRUEBAS.map((p) => {
          const done = hechas.has(p.tipo);
          return (
            <div key={p.tipo} className="card flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{p.nombre}</h2>
                  <span className="badge bg-white/10 text-white/50">{p.tiempo}</span>
                  {done && (
                    <span className="badge bg-emerald-500/20 text-emerald-300">Completada</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/55">{p.desc}</p>
              </div>
              {done ? (
                <span className="btn-ghost pointer-events-none opacity-50">Enviada</span>
              ) : (
                <Link href={`/prueba/${cand.token}/${p.tipo}`} className="btn-primary whitespace-nowrap">
                  Empezar
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {hechas.size === 3 && (
        <div className="card mt-8 border-emerald-500/30 bg-emerald-500/10 text-center">
          <p className="font-medium text-emerald-200">
            ¡Completaste las 3 pruebas! Ya podés cerrar esta ventana. Gracias.
          </p>
        </div>
      )}
    </main>
  );
}
