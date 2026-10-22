# ADR 0001 — Un solo motor de render para vista previa y PDF

- **Estado:** aceptado
- **Fecha:** 2026-10-22

## Contexto

El producto necesita que la vista previa del navegador y el PDF descargado coincidan. Una opción habitual es renderizar el PDF en el servidor con una librería distinta (por ejemplo, LaTeX o un generador de PDF por código) y mantener una vista previa aparte en HTML. Eso duplica reglas de maquetación y produce diferencias difíciles de depurar.

## Decisión

Usar un único pipeline:

1. `markdown-it` convierte el Markdown en HTML.
2. `Paged.js` pagina ese HTML en el navegador respetando las reglas `@page`, los saltos de página y los encabezados/pies.
3. Playwright abre la misma página paginada y la imprime con Chromium.

La vista previa y el PDF consumen exactamente el mismo HTML y el mismo CSS.

## Consecuencias

- Una sola implementación de la maquetación.
- La numeración de páginas, la sangría francesa y los saltos de sección se prueban visualmente en el navegador.
- El servidor necesita Chromium (Playwright), lo que aumenta el tamaño de la instalación y el consumo de memoria.
- Las exportaciones se serializan para evitar picos de memoria.
- Paged.js ejecuta el hook `after` incluso con `auto: false`; por eso se usa `auto: true` y se espera `document.fonts.ready` en `before`.

## Alternativas descartadas

- **LaTeX:** excelente calidad tipográfica, pero exige otra representación del documento y no reutiliza el HTML.
- **Generador de PDF en Node (PDFKit, jsPDF):** obliga a programar la maquetación y no tiene un modelo de página tan expresivo como CSS Paged Media.
- **Vista previa aproximada + PDF distinto:** fue descartado por la diferencia visual entre ambos.

## Referencias

- `lib/render/document.ts`
- `lib/render/markdown.ts`
- `lib/pdf/chromium.ts`
- `app/print/[token]/route.ts`
