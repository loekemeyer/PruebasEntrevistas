import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Pruebas de Entrevistas</h1>
        <p className="mt-3 text-white/60">
          Sistema de evaluación remota de candidatos: Excel, Tipeo y Memoria.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {[
          { t: "Excel", d: "BUSCARV, SUMA, SI y SUMAR.SI.CONJUNTO. Corrección automática." },
          { t: "Tipeo", d: "1 minuto. PPM y precisión." },
          { t: "Memoria", d: "Estudio con anti-copia y 5 preguntas." },
        ].map((x) => (
          <div key={x.t} className="card text-left">
            <h3 className="text-lg font-semibold">{x.t}</h3>
            <p className="mt-1 text-sm text-white/60">{x.d}</p>
          </div>
        ))}
      </div>
      <Link href="/admin" className="btn-primary">
        Entrar al panel de administración
      </Link>
      <p className="text-xs text-white/40">
        Los candidatos acceden con un link único que se genera desde el panel.
      </p>
    </main>
  );
}
