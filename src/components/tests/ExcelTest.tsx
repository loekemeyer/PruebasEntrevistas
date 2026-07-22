"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function fmt(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const CONSIGNAS = [
  "Ir a la hoja «A resolver»: vas a encontrar el pedido de un cliente (Código, Medida y Cajas pedidas).",
  "Columna E ($ x unidad): con +BUSCARV traé el precio unitario de cada medida desde la hoja «Precios Cuadros x Medida».",
  "Columna F ($ Total Pedido): calculá E x Cajas x (Unidades por caja), obteniendo las unidades por caja con +BUSCARV desde «Base de Datos Codigos».",
  "J6 (Total con descuento): con +SUMA calculá el total del pedido aplicando el descuento del cliente (J3).",
  "J7 y J8: con +SI definí si el pedido es «Aceptado» o «Rechazado» según los límites de crédito (J4 y J5).",
  "N3:N8: con +SUMAR.SI.CONJUNTO calculá el total de cajas pedidas por medida.",
];

export default function ExcelTest({
  token,
  iniciadoAtInicial,
  limiteSegundos,
}: {
  token: string;
  iniciadoAtInicial: string | null;
  limiteSegundos: number;
}) {
  // fase: aviso (antes de descargar) → enCurso (cronómetro corriendo)
  const [startMs, setStartMs] = useState<number | null>(
    iniciadoAtInicial ? Date.parse(iniciadoAtInicial) : null
  );
  const [restante, setRestante] = useState(limiteSegundos);
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const router = useRouter();
  const descargaRef = useRef<HTMLAnchorElement>(null);

  // cronómetro
  useEffect(() => {
    if (startMs === null) return;
    const tick = () => {
      const transcurrido = (Date.now() - startMs) / 1000;
      setRestante(limiteSegundos - transcurrido);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startMs, limiteSegundos]);

  async function empezar() {
    setIniciando(true);
    setError("");
    const res = await fetch(`/api/prueba/${token}/excel/iniciar`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setIniciando(false);
    if (!res.ok || !j.ok) {
      setError(j.error || "No se pudo iniciar la prueba.");
      return;
    }
    setStartMs(Date.parse(j.iniciadoAt));
    // dispara la descarga de la planilla
    setTimeout(() => descargaRef.current?.click(), 50);
  }

  async function enviar() {
    if (!file) return;
    setEnviando(true);
    setError("");
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch(`/api/prueba/${token}/excel/submit`, { method: "POST", body: fd });
    setEnviando(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      setEnviado(true);
      router.refresh();
    } else setError(j.error || "No se pudo enviar el archivo.");
  }

  // ===== Enviada =====
  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold">Prueba de Excel enviada</h1>
        <p className="text-white/60">¡Listo! Tu archivo se recibió y registró correctamente.</p>
        <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
      </main>
    );
  }

  const yaEmpezo = startMs !== null;
  const tiempoAgotado = restante <= 0;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href={`/prueba/${token}`} className="text-sm text-white/50 hover:underline">
        ← Volver
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prueba de Excel</h1>
        {yaEmpezo && (
          <div
            className={`rounded-lg px-4 py-2 font-mono text-2xl font-bold ${
              tiempoAgotado ? "text-red-400" : restante <= 120 ? "text-amber-300" : "text-white"
            }`}
          >
            {fmt(restante)}
          </div>
        )}
      </div>

      {/* enlace oculto para disparar la descarga */}
      <a
        ref={descargaRef}
        href={`/api/prueba/${token}/excel/plantilla`}
        className="hidden"
        aria-hidden
      >
        descargar
      </a>

      {/* AVISO antes de descargar */}
      {!yaEmpezo && (
        <>
          <div className="card mt-6 border-amber-500/40 bg-amber-500/10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
              ⏱ Tiempo máximo: 25 minutos
            </h2>
            <p className="mt-2 text-sm text-amber-100/90">
              El cronómetro <b>arranca cuando descargás la planilla</b>. Tenés que resolverla y
              <b> subirla dentro de los 25 minutos</b>. Si te pasás, igual podés enviarla pero queda
              registrado que superaste el tiempo. Preparate antes de empezar.
            </p>
          </div>

          <div className="card mt-4">
            <h2 className="mb-2 font-semibold">Pasos</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
              {CONSIGNAS.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          <button onClick={empezar} disabled={iniciando} className="btn-primary mt-6">
            {iniciando ? "Iniciando…" : "Entendido — descargar planilla y empezar"}
          </button>
        </>
      )}

      {/* EN CURSO: descargar de nuevo + subir */}
      {yaEmpezo && (
        <>
          {tiempoAgotado && (
            <div className="card mt-6 border-red-500/40 bg-red-500/10 text-red-200">
              Se agotó el tiempo de 25 minutos. Podés enviar igual, pero quedará marcado como fuera
              de tiempo.
            </div>
          )}

          <div className="card mt-6">
            <h2 className="mb-2 font-semibold">Pasos</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
              {CONSIGNAS.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>

          <div className="card mt-4">
            <a href={`/api/prueba/${token}/excel/plantilla`} className="btn-ghost">
              ⬇ Volver a descargar la planilla
            </a>

            <h2 className="mb-3 mt-6 font-semibold">Subí la planilla resuelta</h2>
            <p className="mb-3 text-sm text-white/50">
              No cambies los nombres de las hojas. Se corrige automáticamente.
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button onClick={enviar} disabled={!file || enviando} className="btn-primary mt-4">
              {enviando ? "Corrigiendo…" : "Enviar y corregir"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
