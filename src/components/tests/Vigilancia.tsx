"use client";

import { useEffect } from "react";

/**
 * Registra (no bloquea) las señales que ve el admin en "Observaciones":
 * - dispositivo_tactil: pantalla táctil sin mouse (celular/tablet). Una vez por pestaña.
 * - perdio_foco (salir de la ventana o cambiar de pestaña, una vez por salida): solo dentro de una prueba (tipoPrueba), no en el inicio.
 * - captura_pantalla: PrintScreen / Win+Shift+S / Cmd+Shift+3-5. El navegador solo ve
 *   las teclas que el sistema operativo le deja pasar; una foto con el celular no se detecta.
 */
export default function Vigilancia({
  token,
  tipoPrueba = null,
  capturas = true,
}: {
  token: string;
  tipoPrueba?: "tipeo" | "memoria" | null;
  capturas?: boolean;
}) {
  useEffect(() => {
    const log = (evento: string, meta?: unknown) =>
      navigator.sendBeacon?.(
        `/api/prueba/${token}/evento`,
        new Blob([JSON.stringify({ evento, tipoPrueba, meta })], { type: "application/json" })
      );

    const tactil = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const conMouse = window.matchMedia("(any-pointer: fine)").matches;
    const clave = `pe_disp_${token}`;
    let yaRegistrado = false;
    try {
      yaRegistrado = sessionStorage.getItem(clave) === "1";
    } catch {}
    if (tactil && !conMouse && !yaRegistrado) {
      log("dispositivo_tactil", {
        ancho: window.screen.width,
        alto: window.screen.height,
        ua: navigator.userAgent.slice(0, 200),
      });
      try {
        sessionStorage.setItem(clave, "1");
      } catch {}
    }

    // Cambiar de pestaña dispara blur + visibilitychange: se cuenta una sola salida.
    let ultimaSalida = 0;
    const salir = () => {
      const ahora = Date.now();
      if (ahora - ultimaSalida < 1000) return;
      ultimaSalida = ahora;
      log("perdio_foco");
    };
    const onVisibility = () => {
      if (document.hidden) salir();
    };
    const onBlur = salir;
    if (tipoPrueba) {
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
    }
    const quitarFoco = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };

    if (!capturas) return quitarFoco;
    let ultima = 0;
    const marcar = (metodo: string) => {
      const ahora = Date.now();
      if (ahora - ultima < 500) return; // keydown+keyup de la misma tecla
      ultima = ahora;
      log("captura_pantalla", { metodo });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase();
      if (e.key === "PrintScreen") marcar("PrintScreen");
      else if (e.metaKey && e.shiftKey && lower === "s") marcar("Win+Shift+S");
      else if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) marcar(`Cmd+Shift+${e.key}`);
    };
    // Chrome/Edge en Windows solo reportan PrintScreen al soltar
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") marcar("PrintScreen");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      quitarFoco();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [token, tipoPrueba, capturas]);

  return null;
}
