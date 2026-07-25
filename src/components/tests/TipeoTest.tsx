"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Intento = { tipeado: string; segundos: number };

export default function TipeoTest({
  token,
  texto,
  segundos,
  intentosTotal = 2,
}: {
  token: string;
  texto: string;
  segundos: number;
  intentosTotal?: number;
}) {
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(segundos);
  const [finished, setFinished] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [intento, setIntento] = useState(1); // intento actual (1..intentosTotal)
  const [intermedio, setIntermedio] = useState(false); // pantalla entre intentos
  const router = useRouter();
  const startRef = useRef<number>(0);
  const typedRef = useRef("");
  const intentosRef = useRef<Intento[]>([]);

  typedRef.current = typed;

  const enviar = useCallback(
    async (intentos: Intento[]) => {
      setEnviando(true);
      const res = await fetch(`/api/prueba/${token}/tipeo/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentos }),
      });
      const j = await res.json().catch(() => ({}));
      setEnviando(false);
      if (j.ok) {
        setEnviado(true);
        router.refresh();
      }
    },
    [token, router]
  );

  const terminar = useCallback(() => {
    if (finished) return;
    setFinished(true);
    const elapsed = started ? (Date.now() - startRef.current) / 1000 : segundos;
    const registro: Intento = {
      tipeado: typedRef.current,
      segundos: Math.round(Math.min(elapsed, segundos)),
    };
    intentosRef.current = [...intentosRef.current, registro];

    if (intento < intentosTotal) {
      // Todavía queda al menos un intento: mostramos la pantalla intermedia.
      setIntermedio(true);
    } else {
      // Último intento: se envían todos y el server se queda con el mejor.
      enviar(intentosRef.current);
    }
  }, [finished, started, segundos, intento, intentosTotal, enviar]);

  function siguienteIntento() {
    setIntento((n) => n + 1);
    setIntermedio(false);
    setTyped("");
    typedRef.current = "";
    setStarted(false);
    setFinished(false);
    setRemaining(segundos);
    startRef.current = 0;
  }

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

  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold">Prueba de Tipeo enviada</h1>
        <p className="text-white/60">
          ¡Listo! Registramos tus {intentosTotal} intentos y se tomó el mejor.
        </p>
        <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
      </main>
    );
  }

  if (intermedio) {
    const restantes = intentosTotal - intento;
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">⏱️</div>
        <h1 className="text-2xl font-bold">
          Intento {intento} de {intentosTotal} completado
        </h1>
        <p className="text-white/60">
          {restantes === 1
            ? "Te queda 1 intento más. "
            : `Te quedan ${restantes} intentos más. `}
          Se va a tomar el <b className="text-white">mejor</b> de tus {intentosTotal} intentos, así
          que dá lo mejor.
        </p>
        <button onClick={siguienteIntento} disabled={enviando} className="btn-primary">
          Empezar intento {intento + 1}
        </button>
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Prueba de Tipeo</h1>
          <span className="badge bg-white/10 text-white/60">
            Intento {intento} de {intentosTotal}
          </span>
        </div>
        <div className={`rounded-lg px-4 py-2 font-mono text-2xl font-bold ${remaining <= 10 ? "text-red-400" : "text-white"}`}>
          {Math.ceil(remaining)}s
        </div>
      </div>
      <p className="mt-2 text-sm text-white/60">
        Copiá el texto lo más rápido y preciso que puedas. El cronómetro (1 min) arranca cuando
        escribís la primera letra. No se puede pegar.
      </p>
      <div className="mt-3 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-sm text-indigo-100">
        Esta prueba se hace <b>{intentosTotal} veces</b>. De tus {intentosTotal} intentos se toma el{" "}
        <b>mejor</b>, así que si el primero no sale como querés, tenés otra oportunidad.
      </div>

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
