"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccesoCodigo({ token, nombre }: { token: string; nombre: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    const res = await fetch(`/api/prueba/${token}/acceso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    setCargando(false);
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo ingresar");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Hola, {nombre.split(" ")[0]} 👋</h1>
        <p className="mt-2 text-white/60">
          Ingresá el <b>código de 6 dígitos</b> que te enviaron para empezar tus pruebas.
        </p>
      </div>
      <form onSubmit={submit} className="card flex flex-col gap-4">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          placeholder="______"
          autoFocus
          className="input text-center font-mono text-3xl tracking-[0.5em]"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary" disabled={cargando || codigo.length !== 6}>
          {cargando ? "Verificando…" : "Ingresar"}
        </button>
      </form>
      <p className="text-center text-xs text-white/40">
        Si no tenés el código, contactá a quien te envió el link.
      </p>
    </main>
  );
}
