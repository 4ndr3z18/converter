# Converter

Aplicación web local para convertir archivos Markdown (con front matter YAML) en informes PDF con plantillas de formato académico. La primera plantilla implementada es **APA 7 (versión estudiante)**, en tamaño Carta.

El objetivo es que el mismo motor de render alimente la vista previa del navegador y el PDF final, de modo que lo que se ve sea exactamente lo que se descarga.

## Estado

**Fase 0 · motor de render** (v0.1.0)

- Markdown con GFM, tablas, figuras, código resaltado y fórmulas KaTeX.
- Front matter YAML con claves anidadas (`author.name`, `affiliation.university`, …).
- Plantilla APA 7: Carta, Times New Roman 12, interlineado doble, márgenes de 25,4 mm, portada institucional, resumen, palabras clave, referencias con sangría francesa y numeración de páginas.
- Vista previa paginada con Paged.js y descarga del PDF con Chromium (Playwright).
- Avisos por campos obligatorios ausentes, con marcadores visibles en la portada.
- Laboratorio web para editar el Markdown, previsualizar y descargar.
- Pruebas unitarias con Vitest y verificación automática del PDF de muestra.

La persistencia local con SQLite/Drizzle y la migración a Supabase están planificadas para fases posteriores. La interfaz de repositorios ya está separada para facilitar ese cambio.

## Requisitos

- Node.js 22 o superior.
- npm.
- Chromium de Playwright (se instala una sola vez).

## Puesta en marcha

```bash
npm install
npx playwright install chromium
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). `npm install` ejecuta `scripts/copy-vendor.mjs`, que copia Paged.js, KaTeX, highlight.js y las fuentes empaquetadas a `public/vendor/`.

Para producción local:

```bash
npm run build
npm start
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga. |
| `npm run build` | Compila Next.js y prepara los assets de `public/vendor`. |
| `npm start` | Sirve la compilación de producción. |
| `npm run typecheck` | Verifica TypeScript sin emitir archivos. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test` | Ejecuta las pruebas con Vitest. |
| `npm run vendor` | Copia los assets de terceros a `public/vendor`. |
| `npm run pdf:sample` | Genera `artifacts/demo-apa.pdf` a partir del fixture y verifica su contenido. Usa `--start` para levantar el servidor automáticamente. |

## Cómo escribir un documento

El archivo `.md` empieza con un bloque YAML entre `---`, seguido del contenido en Markdown.

```markdown
---
title: "Adopción de herramientas de IA generativa en la gestión de proyectos"
report_type: "Informe de investigación"
author:
  name: "Pérez Quispe, Ana Lucía"
  id: "20231234"
affiliation:
  university: "Universidad Nacional de Ejemplo"
  faculty: "Facultad de Ingeniería"
  logo: "/samples/logo-demo.svg"
course:
  name: "Ingeniería de Software"
  code: "IS-601"
professor:
  name: "Ramírez Torres, Carlos"
  title: "Dr."
section: "A"
cycle: "2026-I"
city: "Lima"
date: "2026-10-22"
keywords: "inteligencia artificial, gestión de proyectos, ingeniería de software"
---

## Resumen

Texto del resumen, sin sangría y sin citas.

## Introducción

Texto de la introducción.

## Referencias

García, M. y Torres, L. (2023). Asistentes de código y aprendizaje de la programación: una revisión sistemática. *Revista de Educación en Ingeniería, 18*(2), 45–67. https://doi.org/10.0000/ejemplo
```

Los títulos `##` se interpretan como encabezados de nivel 1 (centrados en APA), `###` como nivel 2 (a la izquierda) y `####` como nivel 3 (cursiva). Las secciones **Resumen**, **Referencias** y **Anexos** reciben un tratamiento especial.

### Tablas

```markdown
**Tabla 1.**

*Frecuencia de uso por fase*

| Fase | Usos declarados | Usos verificados |
| --- | ---: | ---: |
| Planificación | 58 | 49 |
| Codificación | 142 | 131 |
```

El título de la tabla se detecta con el patrón `Tabla N.` y el texto en cursiva siguiente se usa como título.

### Figuras

```markdown
![Figura 1. Índice de adopción por dimensión](/samples/figura-1.svg)
```

La imagen se muestra centrada y la leyenda se coloca según la plantilla.

### Fórmulas y código

Se admite KaTeX con `$...$` y `$$...$$`, y bloques de código con resaltado de sintaxis.

## API

| Ruta | Método | Descripción |
| --- | --- | --- |
| `/api/health` | GET | Comprueba que el servidor está vivo. |
| `/api/render` | POST | Valida el documento, guarda un trabajo y devuelve `{ token, url, warnings, filename, title, template }`. |
| `/api/pdf` | POST | Genera y devuelve el PDF como adjunto. |
| `/print/[token]` | GET | HTML paginable que consume Paged.js. |

Cuerpo de ejemplo para `/api/render` y `/api/pdf`:

```json
{
  "markdown": "---\ntitle: \"Mi informe\"\n---\n\n## Introducción\n\nTexto.",
  "template": "apa7-informe",
  "overrides": {
    "author.name": "Nombre corregido"
  }
}
```

`overrides` es opcional y permite corregir campos del front matter sin modificar el archivo.

## Plantillas

Las plantillas son objetos JSON validados con Zod (`lib/template/schema.ts`). La plantilla APA vive en `lib/template/presets/apa7.ts` y se registra en `lib/template/presets/index.ts`.

Para crear una plantilla nueva:

1. Duplicá `apa7.ts` y cambiá `slug`, `name`, colores, tipografía, portada, cabecera/pie y campos del documento.
2. Registrala en `lib/template/presets/index.ts`.
3. Añadí pruebas en `lib/template/*.test.ts` si cambia la maqueta.

El esquema cubre tamaño y orientación de página, márgenes, tipografía, encabezados, portada, resumen, índice, cabecera/pie, numeración, referencias, tablas, figuras, citas, marca de agua y el contrato de campos del front matter.

## Arquitectura

```text
Markdown + YAML
      │
      ├─ lib/render/frontmatter.ts   → parseo, overrides, validación y nombre
      ├─ lib/render/markdown.ts      → markdown-it, KaTeX, highlight.js, secciones
      ├─ lib/template/css.ts         → CSS de página y contenido desde la plantilla
      └─ lib/render/document.ts      → HTML completo + script de Paged.js
                                            │
                                            ▼
                                   Paged.js (navegador)
                                            │
                                            ▼
                                   Playwright / Chromium
                                            │
                                            ▼
                                         PDF
```

- **Una sola fuente de verdad:** el HTML y el CSS que se previsualizan son los que imprime Chromium.
- **Sin servicios externos:** todo se ejecuta en la máquina local.
- **Paged.js** pagina el contenido y numera cada hoja. El número se escribe en `data-page-label` y se pinta con `.pagedjs_page::after`, alineado al margen real.
- **Chromium** imprime con el tamaño exacto de la plantilla (Carta = 612 × 792 pt) y sin márgenes adicionales.

## Estructura del proyecto

```text
app/
  api/health/route.ts
  api/pdf/route.ts
  api/render/route.ts
  print/[token]/route.ts
  page.tsx
components/
  lab.tsx
lib/
  api/render-request.ts
  pdf/chromium.ts
  render/{document,frontmatter,markdown}.ts
  store/render-store.ts
  template/{css,schema}.ts
  template/presets/{apa7,index}.ts
  utils/text.ts
fixtures/
  apa-demo.md
public/
  samples/
scripts/
  copy-vendor.mjs
  render-sample.ts
docs/adr/
```

Los renders temporales se guardan en `.data/renders/`. Esa carpeta, `artifacts/` y `public/vendor/` están ignoradas por Git.

## Pruebas y CI

```bash
npm run typecheck
npm run lint
npm test
npm run pdf:sample -- --start
```

`npm run pdf:sample -- --start` compila, arranca el servidor, genera `artifacts/demo-apa.pdf`, extrae el texto y verifica que estén las secciones y datos esperados.

El workflow de GitHub Actions (`.github/workflows/ci.yml`) ejecuta typecheck, lint, pruebas, build y la generación del PDF de muestra, y publica el PDF como artefacto.

## Privacidad

La aplicación está pensada para ejecutarse localmente. No envía documentos a ningún servicio externo. Los archivos que se suban en el futuro a la interfaz se procesarán en la misma máquina.

## Hoja de ruta

- **Fase 0:** motor de render, plantilla APA 7, vista previa y PDF. ✅
- **Fase 1:** persistencia local con SQLite/Drizzle, biblioteca de documentos y editor de plantillas.
- **Fase 2:** Supabase, cuentas y sincronización.
- **Fase 3:** más plantillas por asignatura, exportación de plantillas y control de versiones.

## Decisiones de diseño

Las decisiones importantes están documentadas en [`docs/adr/`](docs/adr/):

- [ADR 0001: motor único de render](docs/adr/0001-motor-unico-de-render.md)
- [ADR 0002: plantillas declarativas y versionadas](docs/adr/0002-plantillas-declarativas.md)
- [ADR 0003: persistencia local y migración a Supabase](docs/adr/0003-persistencia-local.md)
- [ADR 0004: entrega local y CI con PDF de prueba](docs/adr/0004-entrega-y-ci.md)
