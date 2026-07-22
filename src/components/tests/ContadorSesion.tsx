"use client";

import { useEffect, useState } from "react";

/** Contador regresivo del tiempo total de las 3 pruebas (desde el inicio de sesión). */
export default function ContadorSesion({
  sesionAt,
  totalSegundos,
}: {
  sesionAt: string;
  totalSegundos: number;
}) {
  const start = Date.parse(sesionAt);
  const [restante, setRestante] = useState(totalSegundos);

  useEffect(() => {
    const tick = () => setRestante(totalSegundos - (Date.now() - start) / 1000);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, totalSegundos]);

  const s = Math.max(0, Math.round(restante));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const agotado = restante <= 0;

  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-white/40">Tiempo total</div>
      <div
        className={`font-mono text-2xl font-bold ${
          agotado ? "text-red-400" : restante <= 300 ? "text-amber-300" : "text-white"
        }`}
      >
        {m}:{String(r).padStart(2, "0")}
      </div>
    </div>
  );
}
