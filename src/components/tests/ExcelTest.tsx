"use client";

import { useState } from "react";
import Link from "next/link";

const CONSIGNAS = [
  "Ir a la hoja «A resolver»: vas a encontrar el pedido de un cliente (Código, Medida y Cajas pedidas).",
  "Columna E ($ x unidad): con +BUSCARV traé el precio unitario de cada medida desde la hoja «Precios Cuadros x Medida».",
  "Columna F ($ Total Pedido): calculá E x Cajas x (Unidades por caja), obteniendo las unidades por caja con +BUSCARV desde «Base de Datos Codigos».",
  "J6 (Total con descuento): con +SUMA calculá el total del pedido aplicando el descuento del cliente (J3).",
  "J7 y J8: con +SI definí si el pedido es «Aceptado» o «Rechazado» según los límites de crédito (J4 y J5).",
  "N3:N8: con +SUMAR.SI.CONJUNTO calculá el total de cajas pedidas por medida.",
];

type Resultado = {
  puntaje: number;
  valoresCorrectos: number;
  totalValores: number;
  formulasCorrectas: number;
  totalFormulas: number;
  resumenPorGrupo: Record<string, { ok: number; total: number }>;
};

export default function ExcelTest({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function enviar() {
    if (!file) return;
    setEnviando(true);
    setError("");
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch(`/api/prueba/${token}/excel/submit`, { method: "POST", body: fd });
    setEnviando(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) setResultado(j.resultado);
    else setError(j.error || "No se pudo enviar el archivo.");
  }

  if (resultado) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="card text-center">
          <p className="text-white/60">Tu puntaje en la Prueba de Excel</p>
          <p className="my-2 text-5xl font-bold text-indigo-300">{resultado.puntaje}</p>
          <p className="text-sm text-white/50">
            Valores correctos: {resultado.valoresCorrectos}/{resultado.totalValores} · Fórmulas usadas:{" "}
            {resultado.formulasCorrectas}/{resultado.totalFormulas}
          </p>
        </div>
        <div className="card mt-4">
          <h3 className="mb-3 font-semibold">Detalle por bloque</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(resultado.resumenPorGrupo).map(([g, v]) => (
              <li key={g} className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/70">{g}</span>
                <span className={v.ok === v.total ? "text-emerald-300" : "text-amber-300"}>
                  {v.ok}/{v.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 text-center">
          <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href={`/prueba/${token}`} className="text-sm text-white/50 hover:underline">
        ← Volver
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Prueba de Excel</h1>
      <p className="mt-2 text-sm text-white/60">Tiempo estimado: 25 minutos.</p>

      <div className="card mt-6">
        <h2 className="mb-2 font-semibold">Pasos</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
          {CONSIGNAS.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 font-semibold">1) Descargá la planilla</h2>
        <a href={`/api/prueba/${token}/excel/plantilla`} className="btn-ghost">
          ⬇ Descargar planilla (.xlsx)
        </a>

        <h2 className="mb-3 mt-6 font-semibold">2) Resolvela y subila</h2>
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
    </main>
  );
}
