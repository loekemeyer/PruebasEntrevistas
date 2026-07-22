"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  tipo: "excel" | "tipeo" | "memoria";
  puntaje: number | null;
  estado: string;
  detalle: unknown;
  enviado_at: string | null;
};
type Candidato = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  token: string;
  codigo: string | null;
  estado: string;
  created_at: string;
  resultados: Resultado[];
};

const TIPOS: Resultado["tipo"][] = ["excel", "tipeo", "memoria"];
const NOMBRE_TIPO: Record<string, string> = { excel: "Excel", tipeo: "Tipeo", memoria: "Memoria" };

function color(p: number | null): string {
  if (p === null) return "bg-white/10 text-white/50";
  if (p >= 70) return "bg-emerald-500/20 text-emerald-300";
  if (p >= 40) return "bg-amber-500/20 text-amber-300";
  return "bg-red-500/20 text-red-300";
}

export default function AdminPanel({
  candidatosInicial,
  baseUrl,
}: {
  candidatosInicial: Candidato[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<Candidato[]>(candidatosInicial);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [creando, setCreando] = useState(false);
  const [detalle, setDetalle] = useState<Candidato | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const origin = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

  function linkDe(c: Candidato) {
    return `${origin}/prueba/${c.token}`;
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    const res = await fetch("/api/admin/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, sector }),
    });
    setCreando(false);
    if (res.ok) {
      const j = await res.json();
      setCandidatos((prev) => [{ ...j.candidato, resultados: [] }, ...prev]);
      setNombre("");
      setEmail("");
      setSector("");
    }
  }

  async function copiar(c: Candidato) {
    const texto =
      `Prueba de selección\n` +
      `Link: ${linkDe(c)}\n` +
      `Código: ${c.codigo ?? "—"}`;
    await navigator.clipboard.writeText(texto);
    setCopiado(c.id);
    setTimeout(() => setCopiado(null), 1500);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Pruebas</h1>
        <button onClick={logout} className="btn-ghost text-sm">
          Salir
        </button>
      </header>

      <section className="card mb-8">
        <h2 className="mb-4 text-lg font-semibold">Nuevo candidato</h2>
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <label className="label">Nombre y apellido *</label>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Sector a postularse</label>
            <input className="input" value={sector} onChange={(e) => setSector(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={creando}>
              {creando ? "Creando…" : "Crear y generar link"}
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold">Candidatos ({candidatos.length})</h2>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-white/50">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-3">Candidato</th>
              <th className="py-2 pr-3">Sector</th>
              {TIPOS.map((t) => (
                <th key={t} className="py-2 pr-3 text-center">{NOMBRE_TIPO[t]}</th>
              ))}
              <th className="py-2 pr-3 text-center">Total</th>
              <th className="py-2 pr-3 text-center">Código</th>
              <th className="py-2 pr-3">Acceso</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {candidatos.map((c) => {
              const byTipo = new Map(c.resultados.map((r) => [r.tipo, r]));
              const puntajes = c.resultados.map((r) => r.puntaje ?? 0);
              const total =
                c.resultados.length > 0
                  ? Math.round(puntajes.reduce((a, b) => a + b, 0) / c.resultados.length)
                  : null;
              return (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-white/40">{c.email || "—"}</div>
                  </td>
                  <td className="py-3 pr-3 text-white/70">{c.sector || "—"}</td>
                  {TIPOS.map((t) => {
                    const r = byTipo.get(t);
                    return (
                      <td key={t} className="py-3 pr-3 text-center">
                        {r ? (
                          <span className={`badge ${color(r.puntaje)}`}>{r.puntaje}</span>
                        ) : (
                          <span className="text-white/25">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 pr-3 text-center">
                    {total !== null ? (
                      <span className={`badge ${color(total)}`}>{total}</span>
                    ) : (
                      <span className="text-white/25">·</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <span className="font-mono text-sm tracking-widest text-white/80">
                      {c.codigo ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <button onClick={() => copiar(c)} className="btn-ghost px-2 py-1 text-xs">
                      {copiado === c.id ? "¡Copiado!" : "Copiar link + código"}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setDetalle(c)}
                      className="text-xs text-indigo-300 hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              );
            })}
            {candidatos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/40">
                  Todavía no hay candidatos. Creá uno arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {detalle && <DetalleModal candidato={detalle} link={linkDe(detalle)} onClose={() => setDetalle(null)} />}
    </main>
  );
}

function DetalleModal({
  candidato,
  link,
  onClose,
}: {
  candidato: Candidato;
  link: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="card my-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{candidato.nombre}</h3>
            <p className="text-sm text-white/50">
              {candidato.email || "sin email"} · {candidato.sector || "sin sector"}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost px-3 py-1 text-sm">Cerrar</button>
        </div>

        <div className="mb-4 space-y-1 rounded-lg bg-black/20 p-3 text-xs text-white/60">
          <div className="break-all">
            <span className="text-white/40">Link:</span> {link}
          </div>
          <div>
            <span className="text-white/40">Código:</span>{" "}
            <span className="font-mono tracking-widest text-white/80">{candidato.codigo ?? "—"}</span>
          </div>
        </div>

        {candidato.resultados.length === 0 && (
          <p className="text-white/40">Sin pruebas enviadas todavía.</p>
        )}

        <div className="space-y-4">
          {candidato.resultados.map((r) => (
            <div key={r.tipo} className="rounded-lg border border-white/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold">{NOMBRE_TIPO[r.tipo]}</h4>
                <span className={`badge ${color(r.puntaje)}`}>{r.puntaje} / 100</span>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-black/30 p-3 text-[11px] leading-relaxed text-white/70">
                {JSON.stringify(r.detalle, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
