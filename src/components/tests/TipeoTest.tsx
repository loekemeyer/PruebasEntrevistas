"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type Resultado = {
  puntaje: number;
  ppmBruto: number;
  ppmNeto: number;
  precision: number;
  caracteresCorrectos: number;
  caracteresTipeados: number;
  errores: number;
};

export default function TipeoTest({
  token,
  texto,
  segundos,
}: {
  token: string;
  texto: string;
  segundos: number;
}) {
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(segundos);
  const [finished, setFinished] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const startRef = useRef<number>(0);
  const typedRef = useRef("");

  typedRef.current = typed;

  const enviar = useCallback(
    async (elapsed: number) => {
      setEnviando(true);
      const res = await fetch(`/api/prueba/${token}/tipeo/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipeado: typedRef.current, segundos: Math.round(elapsed) }),
      });
      const j = await res.json().catch(() => ({}));
      setEnviando(false);
      if (j.ok) setResultado(j.resultado);
    },
    [token]
  );

  const terminar = useCallback(() => {
    if (finished) return;
    setFinished(true);
    const elapsed = started ? (Date.now() - startRef.current) / 1000 : segundos;
    enviar(Math.min(elapsed, segundos));
  }, [finished, started, segundos, enviar]);

  // temporizador
  useEffect(() => {
    if (!started || finished) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const rem = Math.max(0, segundos - elapsed);
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(id);
        terminar();
      }
    }, 100);
    return () => clearInterval(id);
  }, [started, finished, segundos, terminar]);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (finished) return;
    if (!started) {
      setStarted(true);
      startRef.current = Date.now();
    }
    const val = e.target.value;
    setTyped(val);
    if (val.length >= texto.length) terminar();
  }

  if (resultado) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="card text-center">
          <p className="text-white/60">Tu puntaje en la Prueba de Tipeo</p>
          <p className="my-2 text-5xl font-bold text-indigo-300">{resultado.puntaje}</p>
        </div>
        <div className="card mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <Metrica label="PPM neto" valor={resultado.ppmNeto} />
          <Metrica label="PPM bruto" valor={resultado.ppmBruto} />
          <Metrica label="Precisión" valor={`${resultado.precision}%`} />
          <Metrica label="Errores" valor={resultado.errores} />
        </div>
        <div className="mt-6 text-center">
          <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
        </div>
      </main>
    );
  }

  const correctosHasta = (() => {
    let n = 0;
    for (let i = 0; i < typed.length && i < texto.length; i++) if (typed[i] === texto[i]) n++;
    return n;
  })();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href={`/prueba/${token}`} className="text-sm text-white/50 hover:underline">← Volver</Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prueba de Tipeo</h1>
        <div className={`rounded-lg px-4 py-2 font-mono text-2xl font-bold ${remaining <= 10 ? "text-red-400" : "text-white"}`}>
          {Math.ceil(remaining)}s
        </div>
      </div>
      <p className="mt-2 text-sm text-white/60">
        Copiá el texto lo más rápido y preciso que puedas. El cronómetro (1 min) arranca cuando
        escribís la primera letra. No se puede pegar.
      </p>

      <div className="card mt-6 select-none text-lg leading-relaxed">
        {texto.split("").map((ch, i) => {
          let cls = "text-white/40";
          if (i < typed.length) cls = typed[i] === ch ? "text-emerald-300" : "bg-red-500/40 text-red-200";
          else if (i === typed.length) cls = "bg-indigo-400/40 text-white";
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </div>

      <textarea
        value={typed}
        onChange={onChange}
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        disabled={finished}
        rows={5}
        autoFocus
        placeholder="Empezá a escribir acá…"
        className="input mt-4 font-mono"
      />

      <div className="mt-3 flex items-center justify-between text-sm text-white/50">
        <span>{correctosHasta} correctos / {typed.length} escritos</span>
        <button onClick={terminar} disabled={enviando || !started} className="btn-ghost px-3 py-1 text-sm">
          {enviando ? "Enviando…" : "Terminé"}
        </button>
      </div>
    </main>
  );
}

function Metrica({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}
