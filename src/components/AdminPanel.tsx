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

// Puntajes en base 10.
function color(p: number | null): string {
  if (p === null) return "bg-white/10 text-white/50";
  if (p >= 7) return "bg-emerald-500/30 text-emerald-200";
  if (p >= 4) return "bg-amber-500/30 text-amber-200";
  return "bg-red-500/30 text-red-200";
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

  function mensaje(c: Candidato) {
    return (
      `Hola ${c.nombre.split(" ")[0]}, te enviamos el acceso a las pruebas de selección.\n\n` +
      `Link: ${linkDe(c)}\n` +
      `Código de acceso (6 dígitos): ${c.codigo ?? "—"}\n\n` +
      `Entrá al link, ingresá el código y completá las 3 pruebas. ¡Éxitos!`
    );
  }

  async function copiar(c: Candidato) {
    await navigator.clipboard.writeText(mensaje(c));
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
                  ? Math.round((puntajes.reduce((a, b) => a + b, 0) / c.resultados.length) * 10) / 10
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-4" onClick={onClose}>
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f1725] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold">{NOMBRE_TIPO[r.tipo]}</h4>
                <span className={`badge ${color(r.puntaje)}`}>{r.puntaje} / 10</span>
              </div>
              <DetallePrueba tipo={r.tipo} detalle={r.detalle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function seg2fmt(s: unknown): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  const m = Math.floor(n / 60);
  const r = Math.round(n % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

function Metrica({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg bg-black/20 p-2 text-center">
      <div className="text-lg font-bold">{valor}</div>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DetallePrueba({ tipo, detalle }: { tipo: string; detalle: any }) {
  if (!detalle) return <p className="text-sm text-white/40">Sin detalle.</p>;

  if (tipo === "tipeo") {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Metrica label="PPM neto" valor={detalle.ppmNeto ?? "—"} />
        <Metrica label="PPM bruto" valor={detalle.ppmBruto ?? "—"} />
        <Metrica label="Precisión" valor={`${detalle.precision ?? "—"}%`} />
        <Metrica label="Errores" valor={detalle.errores ?? "—"} />
        <Metrica label="Correctos" valor={detalle.caracteresCorrectos ?? "—"} />
        <Metrica label="Tipeados" valor={detalle.caracteresTipeados ?? "—"} />
        <Metrica label="Segundos" valor={detalle.segundos ?? "—"} />
      </div>
    );
  }

  if (tipo === "memoria") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preguntas: any[] = detalle.preguntas ?? [];
    const eventos: Record<string, number> = detalle.eventosSospechosos ?? {};
    const capturas = (eventos["captura_pantalla"] ?? 0) + (eventos["printscreen"] ?? 0);
    const LABELS: Record<string, string> = {
      captura_pantalla: "Intentó captura de pantalla",
      printscreen: "Intentó captura (PrintScreen)",
      cambio_pestania: "Cambió de pestaña",
      perdio_foco: "Salió de la ventana",
      atajo_bloqueado: "Atajo bloqueado (copiar/guardar)",
      devtools_intento: "Intentó abrir herramientas de desarrollador",
      pegar_bloqueado: "Intentó pegar",
    };
    const sospechosos = Object.entries(eventos).filter(([k]) => k !== "estudio_completado");
    return (
      <div className="space-y-3">
        {capturas > 0 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200">
            📸 Intentó sacar captura de pantalla {capturas} {capturas === 1 ? "vez" : "veces"}
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-white/10 text-white/70">
            Tiempo total: {seg2fmt(detalle.tiempoTotalSegundos)}
          </span>
          {detalle.excedido && (
            <span className="badge bg-red-500/20 text-red-300">⚠ superó 15 min</span>
          )}
        </div>
        <div className="space-y-2">
          {preguntas.map((p) => (
            <div key={p.id} className="rounded-lg bg-black/20 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/80">{p.texto}</span>
                <span
                  className={`badge shrink-0 ${
                    p.puntos === p.peso
                      ? "bg-emerald-500/20 text-emerald-300"
                      : p.puntos > 0
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {p.puntos}/{p.peso}
                </span>
              </div>
              <p className="mt-1 text-white/60">
                <span className="text-white/40">Respondió:</span> {p.respuesta || "—"}
              </p>
              <p className="text-[11px] text-white/40">{p.detalle}</p>
            </div>
          ))}
        </div>
        {sospechosos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-white/40">Eventos detectados:</span>
            {sospechosos.map(([k, v]) => (
              <span key={k} className="badge bg-orange-500/15 text-orange-300">
                {LABELS[k] ?? k} ×{v}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tipo === "excel") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categorias: any[] = detalle.categorias ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const celdasMal: any[] = detalle.celdasMal ?? [];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Metrica label="Tiempo" valor={seg2fmt(detalle.tiempoSegundos)} />
          <Metrica label="¿Excedió?" valor={detalle.excedido ? "Sí" : "No"} />
        </div>

        <ul className="space-y-1 text-sm">
          {categorias.map((c) => (
            <li key={c.clave} className="flex items-center justify-between gap-3 border-b border-white/5 py-1">
              <span className="text-white/70">
                {c.nombre} <span className="text-white/40">— {c.nivel}</span>
              </span>
              <span className={c.pts === c.max ? "text-emerald-300" : c.pts > 0 ? "text-amber-300" : "text-red-300"}>
                {c.pts}/{c.max}
              </span>
            </li>
          ))}
        </ul>

        {celdasMal.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-white/50">Celdas con resultado distinto ({celdasMal.length})</p>
            <ul className="space-y-1 text-xs">
              {celdasMal.map((it) => (
                <li key={it.coord} className="flex justify-between gap-2 rounded bg-black/40 px-2 py-1">
                  <span className="font-mono text-white/70">{it.coord}</span>
                  <span className="text-white/50">
                    esperado <b className="text-emerald-300">{String(it.esperado)}</b> · puso{" "}
                    <b className="text-red-300">{String(it.obtenido ?? "—")}</b>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <pre className="max-h-64 overflow-auto rounded bg-black/30 p-3 text-[11px] text-white/70">
      {JSON.stringify(detalle, null, 2)}
    </pre>
  );
}
