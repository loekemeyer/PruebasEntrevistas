"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PreguntaPub = { id: string; texto: string; tipo: "numero" | "keywords" | "lista" };
type Material = {
  titulo: string;
  bloques: { subtitulo: string; items: string[] }[];
  seguimiento: string[];
};
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
  material,
  preguntas,
  tiempoSugeridoMin,
  limiteSegundos,
  iniciadoAtInicial,
}: {
  token: string;
  nombre: string;
  email: string;
  material: Material;
  preguntas: PreguntaPub[];
  tiempoSugeridoMin: number;
  limiteSegundos: number;
  iniciadoAtInicial: string | null;
}) {
  const [fase, setFase] = useState<"intro" | "estudio" | "preguntas">("intro");
  const [pagina, setPagina] = useState(0);
  const [oculto, setOculto] = useState(false);

  // El material se estudia por bloques: cada bloque en su propia "página", y el
  // seguimiento al final. Así ninguna captura/foto tiene todo el texto junto.
  const paginas: { titulo: string | null; bloques: Material["bloques"]; seguimiento: string[] }[] = [
    ...material.bloques.map((b, i) => ({
      titulo: i === 0 ? material.titulo : null,
      bloques: [b],
      seguimiento: [] as string[],
    })),
    { titulo: null, bloques: [] as Material["bloques"], seguimiento: material.seguimiento },
  ];
  const esUltima = pagina >= paginas.length - 1;
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const router = useRouter();
  const [startMs, setStartMs] = useState<number | null>(
    iniciadoAtInicial ? Date.parse(iniciadoAtInicial) : null
  );
  const [restante, setRestante] = useState(limiteSegundos);
  const inicioRef = useRef(0);

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

  // ===== Anti-copia (solo durante el estudio) =====
  useEffect(() => {
    if (fase !== "estudio") return;

    let ultimaCaptura = 0;
    const marcarCaptura = (metodo: string) => {
      const ahora = Date.now();
      if (ahora - ultimaCaptura < 500) return; // evita contar doble (keydown+keyup)
      ultimaCaptura = ahora;
      navigator.clipboard?.writeText("").catch(() => {});
      logEvento("captura_pantalla", { metodo });
      setOculto(true);
      setTimeout(() => setOculto(false), 1500);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const lower = k.toLowerCase();
      const meta = e.metaKey;
      const ctrl = e.ctrlKey || e.metaKey;

      // Intentos de captura por atajo (el SO igual puede capturar; registramos y avisamos)
      const esWinRecorte = meta && e.shiftKey && lower === "s"; // Windows: Win+Shift+S (Recorte)
      const esMacShot = meta && e.shiftKey && ["3", "4", "5"].includes(k); // Mac: Cmd+Shift+3/4/5
      if (esWinRecorte || esMacShot) {
        e.preventDefault();
        marcarCaptura(esWinRecorte ? "Win+Shift+S" : `Cmd+Shift+${k}`);
        return;
      }
      // PrintScreen: algunos navegadores lo reportan acá
      if (k === "PrintScreen") {
        e.preventDefault();
        marcarCaptura("PrintScreen");
        return;
      }

      if (ctrl && ["c", "x", "s", "p", "u"].includes(lower)) {
        e.preventDefault();
        logEvento("atajo_bloqueado", { key: k });
      }
      if (k === "F12" || (ctrl && e.shiftKey && ["i", "j", "c"].includes(lower))) {
        e.preventDefault();
        logEvento("devtools_intento");
      }
    };
    // Chrome/Edge suelen disparar PrintScreen solo en keyup (el SO captura al soltar)
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") marcarCaptura("PrintScreen");
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

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [fase, logEvento]);

  async function empezarEstudio() {
    setIniciando(true);
    const res = await fetch(`/api/prueba/${token}/memoria/iniciar`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setIniciando(false);
    if (j?.ok && j.iniciadoAt) setStartMs(Date.parse(j.iniciadoAt));
    inicioRef.current = Date.now();
    setFase("estudio");
    setOculto(false);
  }

  function irAPreguntas() {
    const segundos = Math.round((Date.now() - inicioRef.current) / 1000);
    logEvento("estudio_completado", { segundos });
    setFase("preguntas");
  }

  async function enviar() {
    setEnviando(true);
    const segundosEstudio = Math.round((Date.now() - inicioRef.current) / 1000);
    const res = await fetch(`/api/prueba/${token}/memoria/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuestas, segundosEstudio }),
    });
    const j = await res.json().catch(() => ({}));
    setEnviando(false);
    if (j.ok) {
      setEnviado(true);
      router.refresh();
    }
  }

  // ===== Enviada =====
  if (enviado) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold">Prueba de Memoria enviada</h1>
        <p className="text-white/60">¡Listo! Tus respuestas se registraron correctamente.</p>
        <Link href={`/prueba/${token}`} className="btn-primary">Volver a mis pruebas</Link>
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
              <b>Estudio:</b> vas a ver un texto para <b>leer y memorizar</b>. Estudialo con atención.
            </li>
            <li>
              <b>Preguntas:</b> cuando toques «Continuar», pasás a responder {preguntas.length} preguntas.
              <b> No vas a poder volver al material.</b>
            </li>
          </ol>
        </div>

        <div className="card mt-4 border-amber-500/40 bg-amber-500/10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
            ⏱ Tiempo máximo: 15 minutos
          </h2>
          <p className="mt-2 text-sm text-amber-100/90">
            El cronómetro <b>arranca cuando tocás «Empezar»</b> y cubre el estudio y las preguntas
            (sugerido: dedicale ~{tiempoSugeridoMin} min al estudio). Si te pasás, igual podés
            terminar pero queda registrado. El material <b>no se puede copiar ni seleccionar</b> y
            se registran los cambios de pestaña o intentos de captura.
          </p>
        </div>

        <button onClick={empezarEstudio} disabled={iniciando} className="btn-primary mt-6">
          {iniciando ? "Iniciando…" : "Empezar (arranca el cronómetro)"}
        </button>
      </main>
    );
  }

  // ===== Estudio (texto completo, anti-copia) =====
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
          <span
            className={`font-mono text-xl font-bold ${
              restante <= 0 ? "text-red-400" : restante <= 120 ? "text-amber-300" : "text-white"
            }`}
          >
            {fmt(restante)}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/60">
          Leé y memorizá esta sección. Al tocar «Siguiente» pasás a la próxima y <b>no podés volver</b>.
        </p>

        <div className="mt-3 text-xs font-medium text-white/40">
          Sección {pagina + 1} de {paginas.length}
        </div>

        <div className="relative mt-2">
          {/* Material del bloque actual (no seleccionable) */}
          <div className="card select-none space-y-5 text-[15px] leading-relaxed">
            {paginas[pagina].titulo && (
              <h2 className="text-xl font-bold text-indigo-200">{paginas[pagina].titulo}</h2>
            )}

            {paginas[pagina].bloques.map((b) => (
              <div key={b.subtitulo}>
                <h3 className="font-semibold text-white/90">{b.subtitulo}:</h3>
                <ul className="mt-1 list-disc pl-6 text-white/80">
                  {b.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}

            {paginas[pagina].seguimiento.length > 0 && (
              <div className="space-y-2 text-white/80">
                <h3 className="font-semibold text-white/90">Seguimiento de fecha de entrega:</h3>
                {paginas[pagina].seguimiento.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            {/* Watermark tileado con datos del candidato */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
              <div className="flex h-full w-full flex-wrap gap-6 rotate-[-20deg] text-xs">
                {Array.from({ length: 60 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {nombre} · candidato
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Overlay que tapa el material si pierde foco / cambia de pestaña */}
          {oculto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/90 text-center">
              <p className="font-semibold text-red-300">Material oculto</p>
              <p className="text-sm text-white/60">Volvé a esta ventana para seguir estudiando.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          {esUltima ? (
            <button onClick={irAPreguntas} className="btn-primary">
              Continuar a las preguntas →
            </button>
          ) : (
            <button onClick={() => setPagina((p) => p + 1)} className="btn-primary">
              Siguiente →
            </button>
          )}
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
