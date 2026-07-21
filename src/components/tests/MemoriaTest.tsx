"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type PreguntaPub = { id: string; texto: string; tipo: "numero" | "keywords" | "lista" };
type Resultado = {
  puntaje: number;
  preguntas: { id: string; texto: string; puntos: number; peso: number; detalle: string }[];
};

// Cuántas letras se revelan por delante de la posición correcta actual.
const LOOKAHEAD = 14;

function fmt(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function MemoriaTest({
  token,
  nombre,
  email,
  textoEstudio,
  preguntas,
  tiempoSugeridoMin,
  limiteSegundos,
  iniciadoAtInicial,
}: {
  token: string;
  nombre: string;
  email: string;
  textoEstudio: string;
  preguntas: PreguntaPub[];
  tiempoSugeridoMin: number;
  limiteSegundos: number;
  iniciadoAtInicial: string | null;
}) {
  const [fase, setFase] = useState<"intro" | "estudio" | "preguntas">("intro");
  const [typed, setTyped] = useState("");
  const [oculto, setOculto] = useState(false);
  const [errores, setErrores] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [excedido, setExcedido] = useState(false);
  const [tiempoTotal, setTiempoTotal] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [startMs, setStartMs] = useState<number | null>(
    iniciadoAtInicial ? Date.parse(iniciadoAtInicial) : null
  );
  const [restante, setRestante] = useState(limiteSegundos);
  const inicioRef = useRef(0);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // cronómetro (arranca al empezar; persiste en la DB vía iniciado_at)
  useEffect(() => {
    if (startMs === null) return;
    const tick = () => setRestante(limiteSegundos - (Date.now() - startMs) / 1000);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startMs, limiteSegundos]);

  const logEvento = useCallback(
    (evento: string, meta?: unknown) => {
      navigator.sendBeacon?.(
        `/api/prueba/${token}/evento`,
        new Blob([JSON.stringify({ evento, tipoPrueba: "memoria", meta })], {
          type: "application/json",
        })
      );
    },
    [token]
  );

  // largo del prefijo correcto tipeado
  const matching = (() => {
    let n = 0;
    while (n < typed.length && n < textoEstudio.length && typed[n] === textoEstudio[n]) n++;
    return n;
  })();
  const completo = matching >= textoEstudio.length;
  const revelado = Math.min(textoEstudio.length, matching + LOOKAHEAD);

  // ===== Anti-copia (solo durante el estudio) =====
  useEffect(() => {
    if (fase !== "estudio") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      // PrintScreen: no se puede impedir la captura del SO, pero limpiamos el portapapeles y registramos.
      if (k === "PrintScreen") {
        navigator.clipboard?.writeText("").catch(() => {});
        logEvento("printscreen");
        setOculto(true);
        setTimeout(() => setOculto(false), 1200);
      }
      // Atajos de copia / guardar / imprimir / devtools
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ["c", "x", "s", "p", "u"].includes(k.toLowerCase())) {
        e.preventDefault();
        logEvento("atajo_bloqueado", { key: k });
      }
      if (k === "F12" || (ctrl && e.shiftKey && ["i", "j", "c"].includes(k.toLowerCase()))) {
        e.preventDefault();
        logEvento("devtools_intento");
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        setOculto(true);
        logEvento("cambio_pestania");
      } else {
        setOculto(false);
      }
    };
    const onBlur = () => {
      setOculto(true);
      logEvento("perdio_foco");
    };
    const onFocus = () => setOculto(false);
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setOculto(true);
        logEvento("salio_pantalla_completa");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [fase, logEvento]);

  async function empezarEstudio() {
    setIniciando(true);
    // marca/lee el inicio en la DB (cronómetro no reseteable)
    const res = await fetch(`/api/prueba/${token}/memoria/iniciar`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setIniciando(false);
    if (j?.ok && j.iniciadoAt) setStartMs(Date.parse(j.iniciadoAt));
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* algunos navegadores lo rechazan; seguimos igual */
    }
    inicioRef.current = Date.now();
    setFase("estudio");
    setOculto(false);
    setTimeout(() => areaRef.current?.focus(), 100);
  }

  function onType(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    // contar error: si el último caracter agregado no coincide en su posición
    if (val.length > typed.length) {
      const i = val.length - 1;
      if (val[i] !== textoEstudio[i]) setErrores((n) => n + 1);
    }
    setTyped(val);
  }

  async function irAPreguntas() {
    const segundos = Math.round((Date.now() - inicioRef.current) / 1000);
    logEvento("estudio_completado", { segundos, errores });
    if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {});
    setFase("preguntas");
  }

  async function enviar() {
    setEnviando(true);
    const segundosEstudio = Math.round((Date.now() - inicioRef.current) / 1000);
    const res = await fetch(`/api/prueba/${token}/memoria/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuestas, segundosEstudio, errores }),
    });
    const j = await res.json().catch(() => ({}));
    setEnviando(false);
    if (j.ok) {
      setResultado(j.resultado);
      setExcedido(!!j.excedido);
      setTiempoTotal(typeof j.tiempoTotalSegundos === "number" ? j.tiempoTotalSegundos : null);
    }
  }

  // ===== Resultado =====
  if (resultado) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="card text-center">
          <p className="text-white/60">Tu puntaje en la Prueba de Memoria</p>
          <p className="my-2 text-5xl font-bold text-indigo-300">{resultado.puntaje}</p>
          {tiempoTotal !== null && (
            <p className={`text-sm ${excedido ? "text-red-300" : "text-white/50"}`}>
              Tiempo total: {fmt(tiempoTotal)}
              {excedido ? " · ⚠ superó el máximo de 15 min" : ""}
            </p>
          )}
        </div>
        <div className="card mt-4 space-y-2">
          {resultado.preguntas.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 text-sm">
              <span className="text-white/70">{p.texto}</span>
              <span className={p.puntos === p.peso ? "text-emerald-300" : p.puntos > 0 ? "text-amber-300" : "text-red-300"}>
                {p.puntos}/{p.peso}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
        </div>
      </main>
    );
  }

  // ===== Intro =====
  if (fase === "intro") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Link href={`/prueba/${token}`} className="text-sm text-white/50 hover:underline">← Volver</Link>
        <h1 className="mt-3 text-3xl font-bold">Prueba de Memoria</h1>
        <div className="card mt-6 space-y-3 text-sm text-white/70">
          <p>Esta prueba tiene dos partes:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <b>Estudio:</b> vas a <b>leer y tipear</b> un texto. Se revela de a poco a medida que
              escribís.
            </li>
            <li>
              <b>Preguntas:</b> cuando termines de tipear el texto, pasás a responder {preguntas.length} preguntas.
              <b> No vas a poder volver al material.</b>
            </li>
          </ol>
        </div>

        <div className="card mt-4 border-amber-500/40 bg-amber-500/10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
            ⏱ Tiempo máximo: 15 minutos
          </h2>
          <p className="mt-2 text-sm text-amber-100/90">
            El cronómetro <b>arranca cuando tocás «Empezar»</b> y cubre el estudio y las preguntas.
            Si te pasás, igual podés terminar pero queda registrado que superaste el tiempo.
            El material no se puede copiar ni seleccionar; se pide pantalla completa y se registran
            los cambios de pestaña o intentos de captura.
          </p>
        </div>

        <button onClick={empezarEstudio} disabled={iniciando} className="btn-primary mt-6">
          {iniciando ? "Iniciando…" : "Empezar (arranca el cronómetro)"}
        </button>
      </main>
    );
  }

  // ===== Estudio (tipeo con revelado) =====
  if (fase === "estudio") {
    return (
      <main
        className="relative mx-auto max-w-3xl p-6"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Estudio</h1>
          <div className="flex items-center gap-3">
            <span className="badge bg-white/10 text-white/60">
              {Math.round((matching / textoEstudio.length) * 100)}%
            </span>
            <span
              className={`font-mono text-xl font-bold ${
                restante <= 0 ? "text-red-400" : restante <= 120 ? "text-amber-300" : "text-white"
              }`}
            >
              {fmt(restante)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/60">
          Leé y tipeá el texto. Podés borrar para corregir. Se revela a medida que avanzás.
        </p>

        {/* Área de texto revelado (no seleccionable) */}
        <div className="relative mt-4">
          <div className="card select-none whitespace-pre-wrap font-mono text-lg leading-relaxed">
            {textoEstudio.split("").map((ch, i) => {
              if (i >= revelado) return null;
              let cls = "text-white/45";
              if (i < typed.length) cls = typed[i] === ch ? "text-emerald-300" : "bg-red-500/40 text-red-200";
              else if (i === typed.length) cls = "bg-indigo-400/50 text-white";
              return (
                <span key={i} className={cls}>
                  {ch}
                </span>
              );
            })}
            {revelado < textoEstudio.length && <span className="text-white/20"> ▓▓▓…</span>}

            {/* Watermark tileado con datos del candidato */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
              <div className="flex h-full w-full flex-wrap gap-6 rotate-[-20deg] text-xs">
                {Array.from({ length: 60 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {nombre} · {email || "candidato"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Overlay que tapa el material si pierde foco / sale de pantalla completa */}
          {oculto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/90 text-center">
              <p className="font-semibold text-red-300">Material oculto</p>
              <p className="text-sm text-white/60">Volvé a esta ventana para seguir estudiando.</p>
            </div>
          )}
        </div>

        <textarea
          ref={areaRef}
          value={typed}
          onChange={onType}
          onPaste={(e) => {
            e.preventDefault();
            logEvento("pegar_bloqueado");
          }}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          className="input mt-4 font-mono"
          placeholder="Tipeá acá lo que vas leyendo…"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-white/40">Errores de tipeo: {errores}</span>
          <button onClick={irAPreguntas} disabled={!completo} className="btn-primary">
            {completo ? "Continuar a las preguntas →" : "Terminá de tipear el texto"}
          </button>
        </div>
      </main>
    );
  }

  // ===== Preguntas =====
  const todasRespondidas = preguntas.every((q) => (respuestas[q.id] ?? "").trim().length > 0);
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Preguntas</h1>
        <span
          className={`font-mono text-xl font-bold ${
            restante <= 0 ? "text-red-400" : restante <= 120 ? "text-amber-300" : "text-white"
          }`}
        >
          {fmt(restante)}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/60">Respondé de forma concisa. Ya no podés volver al material.</p>
      <div className="mt-6 space-y-5">
        {preguntas.map((q, i) => (
          <div key={q.id} className="card">
            <label className="label">{i + 1}. {q.texto}</label>
            {q.tipo === "numero" ? (
              <input
                type="text"
                inputMode="numeric"
                className="input"
                value={respuestas[q.id] ?? ""}
                onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: e.target.value }))}
              />
            ) : (
              <textarea
                rows={2}
                className="input"
                value={respuestas[q.id] ?? ""}
                onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <button onClick={enviar} disabled={!todasRespondidas || enviando} className="btn-primary mt-6">
        {enviando ? "Enviando…" : "Enviar respuestas"}
      </button>
    </main>
  );
}
