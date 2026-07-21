# Pruebas de Entrevistas

Sistema web para tomar **pruebas de selección a distancia** y **puntuarlas
automáticamente**. Cada candidato recibe un **link único** y hace tres pruebas:

| Prueba | Qué mide | Corrección |
|--------|----------|-----------|
| **Excel** | BUSCARV, SUMA, SI, SUMAR.SI.CONJUNTO | Automática: descarga una planilla, la resuelve en Excel real y la sube; el server lee valores **y** fórmulas y compara contra la clave. |
| **Tipeo** | Velocidad (PPM) y precisión | Automática: réplica local de 1 minuto sobre un texto fijo. |
| **Memoria** | Retención de un instructivo | El candidato **lee y tipea** el material (se revela letra por letra, no se puede copiar) y luego responde 5 preguntas autocorregidas. |

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Supabase (Postgres)** como base de datos — proyecto *Control Partes Talleristas*
- Todo el acceso a la DB es **server-side** con la `service_role` key. Las tablas
  tienen **RLS activado sin políticas**, así que desde el navegador no se puede
  tocar nada: el cliente nunca habla directo con Supabase.

## Tablas (ya creadas en Supabase)

En el esquema `public`, con prefijo `pe_` para no mezclarse con las tablas existentes:

- `pe_candidatos` — nombre, email, sector, `token` (para el link), estado
- `pe_resultados` — un registro por (candidato, prueba): puntaje, detalle (jsonb), respuestas
- `pe_eventos` — auditoría anti-copia de la prueba de memoria

Se crearon vía migración (`pruebas_entrevistas_public_tables`). Si necesitás
recrearlas en otro proyecto, el SQL está en el historial de migraciones de Supabase.

## Puesta en marcha (local)

1. Copiá `.env.example` a `.env.local` y completá:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://hrxfctzncixxqmpfhskv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<<< service_role (Supabase → Project Settings → API) >>>
   ADMIN_PASSWORD=<<< clave para entrar al panel >>>
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

   > La `service_role` key es **secreta**: nunca se commitea. Va solo en `.env.local`
   > (local) y en las variables de entorno del hosting (producción).

2. Instalá y corré:

   ```bash
   npm install
   npm run dev
   ```

3. Abrí `http://localhost:3000` → **Panel de administración**.

## Uso

1. Entrás a `/admin` con `ADMIN_PASSWORD`.
2. Creás un candidato (nombre, email, sector) → se genera su **link único**
   (`/prueba/<token>`). Copiás el link y se lo mandás.
3. El candidato entra al link y hace las 3 pruebas (en cualquier orden). Una prueba
   enviada no se puede rehacer.
4. En el panel ves el puntaje de cada prueba (0–100), el total y el **detalle**
   (desglose por bloque, respuestas crudas, eventos anti-copia).

## Cómo se puntúa

- **Excel (0–100):** 70% por resultados correctos (29 celdas: E3:E12, F3:F12, J6,
  J7, J8, N3:N8) y 30% por haber usado la fórmula esperada en cada celda
  (los `.xlsx` guardan las funciones en inglés: `VLOOKUP`, `SUM`, `IF`, `SUMIFS`).
- **Tipeo (0–100):** PPM neto = (caracteres correctos ÷ 5) ÷ minutos. El puntaje
  escala contra un objetivo (40 PPM = 100%). Se reporta también PPM bruto,
  precisión y errores.
- **Memoria (0–100):** 5 preguntas de 20 puntos. Las numéricas exigen el número
  exacto; las abiertas puntúan por conceptos/nombres clave presentes. Se guardan
  las respuestas crudas para revisión manual.

Los pesos y objetivos son constantes fáciles de ajustar en `src/lib/tests/*`.

## Anti-copia (prueba de memoria)

El estudio se hace **tipeando** el material, que se revela de a poco (letra por
letra, con un look-ahead corto), así ningún screenshot captura todo el texto.
Además: no se puede seleccionar/copiar/click derecho, se pide pantalla completa,
se tapa el material al perder el foco o cambiar de pestaña, hay watermark con los
datos del candidato, y se registran los intentos (PrintScreen, atajos, devtools,
cambios de pestaña) en `pe_eventos`.

> **Límite real e insalvable:** ningún sitio web puede impedir la captura de
> pantalla del sistema operativo ni una foto con el celular. Estas medidas
> **disuaden y registran**, no bloquean al 100%. La defensa fuerte es el propio
> mecanismo de tipear con revelado parcial.

## Deploy online (Vercel)

1. Subí el repo a GitHub (ya está en la branch de trabajo).
2. En Vercel: *New Project* → importá el repo (Next.js se detecta solo).
3. Cargá las variables de entorno (las mismas de `.env.local`, con
   `NEXT_PUBLIC_BASE_URL` = tu dominio de Vercel).
4. Deploy. Los candidatos entran por `https://tu-dominio/prueba/<token>`.

## Merge con el proyecto principal

Está pensado para integrarse con tu app local (misma Supabase):

- Las tablas viven en `public` (mismo esquema que tu app) con prefijo `pe_`.
- La lógica de pruebas y corrección está aislada en `src/lib/tests/` y
  `src/lib/db.ts`; las pantallas en `src/app/prueba/` y `src/components/tests/`.
- El auth de admin (`src/lib/auth.ts`) es un placeholder de una sola clave,
  reemplazable por el login de tu app.
- Cuando quieras, tu app puede crear candidatos (insert en `pe_candidatos`) y
  mandar el link `/prueba/<token>` desde donde ya envías cosas a los postulados.

## Estructura

```
src/
  app/
    admin/                 # panel (login + tabla de candidatos y puntajes)
    prueba/[token]/        # hub del candidato + una página por prueba
    api/                   # rutas server (login, candidatos, submit de cada prueba, eventos)
  components/
    AdminPanel.tsx
    tests/                 # ExcelTest, TipeoTest, MemoriaTest, YaEnviada
  lib/
    supabase.ts            # cliente service-role (solo server)
    auth.ts                # auth admin (placeholder)
    db.ts                  # acceso a datos
    tests/                 # excel.ts, tipeo.ts, memoria.ts (+ clave de respuestas)
material/                  # archivos originales de referencia (vacío, resuelto, docs)
```
