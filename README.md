# Converter

Aplicación web local para convertir archivos Markdown (con front matter YAML) en PDF usando **plantillas HTML/CSS editables** y **Handlebars**. Incluye la plantilla **APA 7 (versión estudiante)** en tamaño Carta.

La vista previa y el PDF final usan el mismo HTML y el mismo CSS: Markdown se convierte a HTML, Handlebars lo inyecta en la plantilla, Paged.js lo pagina y Chromium lo imprime.

## Estado

**v0.2.0 · plantillas HTML/CSS**

- Pantalla de inicio con botón `+` y zona para arrastrar un archivo `.md`.
- Plantillas formadas por `template.json`, `template.html` y `template.css`.
- Sintaxis Handlebars para datos, condicionales y bucles.
- Editor visual con CodeMirror 6, pestañas HTML/CSS/Metadatos y vista previa paginada.
- Plantillas integradas de solo lectura y plantillas locales editables en `.data/templates/`.
- Creación, duplicado, importación/exportación JSON e importación de carpetas.
- Imágenes locales subidas a `.data/uploads/` y servidas por `/api/assets/…`.
- Plantilla APA 7 portada a HTML/CSS: Carta exacta, portada, resumen, tabla, figura, referencias y anexos.
- Avisos por campos obligatorios ausentes y descarga con marcadores visibles.
- Verificación automática del PDF APA: 11 páginas y `MediaBox [0 0 612 792]`.

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

## Flujo rápido

1. En el inicio, elegí una plantilla.
2. Pulsá `+` o arrastrá un archivo `.md`, `.markdown` o `.txt`.
3. Revisá la vista previa y los avisos de campos faltantes.
4. Descargá el PDF con el nombre definido por la plantilla.
5. Para crear o editar plantillas, entrá en **Plantillas**.

La app procesa el documento en tu equipo. El Markdown no se sube a internet.

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
| `npm run pdf:sample` | Genera `artifacts/demo-apa.pdf`, extrae el texto y verifica contenido, 11 páginas y tamaño Carta. Usa `--start` para levantar el servidor automáticamente. |

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

Texto del resumen.

## Introducción

Texto de la introducción.

## Referencias

García, M. y Torres, L. (2023). Asistentes de código y aprendizaje de la programación: una revisión sistemática. *Revista de Educación en Ingeniería, 18*(2), 45–67. https://doi.org/10.0000/ejemplo
```

Los títulos `##` se interpretan como encabezados de nivel 1, `###` como nivel 2 y `####` como nivel 3. Las secciones **Resumen**, **Referencias** y **Anexos** reciben un tratamiento especial según los metadatos de la plantilla.

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

## Plantillas HTML/CSS

Una plantilla es una carpeta con tres archivos:

```text
templates/apa7/                 # integrada (solo lectura)
  template.json
  template.html
  template.css

.data/templates/mi-plantilla/   # local (editable)
  template.json
  template.html
  template.css
```

El identificador de la carpeta debe usar minúsculas, números y guiones: `mi-plantilla`. Las plantillas integradas viven en `templates/` y las locales en `.data/templates/`.

### `template.json`

```json
{
  "name": "Mi plantilla",
  "description": "Plantilla de ejemplo.",
  "fields": [
    { "key": "title", "label": "Título", "required": true },
    { "key": "author.name", "label": "Autor", "required": false }
  ],
  "sections": {
    "abstract": ["Resumen", "Abstract"],
    "references": ["Referencias", "References"],
    "appendix": ["Anexo", "Apéndice", "Appendix"]
  },
  "numbering": {
    "enabled": true,
    "format": "{{page}}",
    "position": "top-right",
    "skipFirstPage": false,
    "fontSize": 12,
    "fontFamily": "\"Times New Roman\", Tinos, \"Liberation Serif\", serif",
    "color": "#000000"
  },
  "filenamePattern": "{{title}}"
}
```

- `fields` define los campos que se validan y los avisos de obligatorios.
- `sections` indica qué títulos se clasifican como resumen, referencias o anexos.
- `numbering.position` acepta `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center` y `bottom-right`.
- `numbering.format` admite `{{page}}` y `{{pages}}`.
- `filenamePattern` usa claves del front matter, incluidas claves anidadas como `{{author.name}}`. El nombre se sanea y se le añade `.pdf`.

### Contexto de Handlebars

En `template.html` están disponibles:

- Las claves del front matter en el nivel superior (`{{title}}`, `{{author.name}}`, `{{course.code}}`, …).
- `content`: todas las secciones ya convertidas a HTML, con envoltorios.
- `preamble`: contenido anterior al primer `##`.
- `sections`: todas las secciones, con `title`, `slug`, `level`, `html`, `bodyHtml`, `headings`, `kind` y banderas `isAbstract`, `isReferences`, `isAppendix`, `isBody`.
- `bodySections`: secciones de cuerpo, sin resumen, referencias ni anexos.
- `referenceSections`, `appendixSections` y `abstractSections`.
- `abstract`: `{ title, html, keywords, keywordsLabel }` o `null`. `html` no incluye el encabezado.
- `references`: primer objeto de referencia o `null`.
- `toc`: encabezados para un índice; la plantilla decide cómo mostrarlos.
- `title`, `authorName`, `dateLong`, `keywords`, `templateMeta` y `templateFields`.

`html` incluye el encabezado de la sección; `bodyHtml` lo excluye. Para insertar HTML ya generado usá triple llave: `{{{html}}}`. Para texto del front matter usá doble llave: `{{title}}`, que escapa HTML.

Ejemplo mínimo:

```html
<main class="doc">
  <header class="cover">
    <h1>{{field "title" "título"}}</h1>
    {{#if author.name}}<p>{{author.name}}</p>{{/if}}
  </header>

  {{#if abstract}}
  <section class="abstract-page">
    <h2>Resumen</h2>
    {{abstract.html}}
    {{#if abstract.keywords}}
      <p><em>Palabras clave:</em> {{abstract.keywords}}</p>
    {{/if}}
  </section>
  {{/if}}

  {{#each bodySections}}
    <section>{{{html}}}</section>
  {{/each}}

  {{#each referenceSections}}
    <section class="references-section">{{{html}}}</section>
  {{/each}}
</main>
```

### Helpers

| Helper | Uso | Resultado |
| --- | --- | --- |
| `field` | `{{field "author.name" "autor"}}` | Valor escapado o `[Falta: autor]` si el campo es obligatorio y está vacío. Admite un tercer argumento booleano para forzar la obligatoriedad. |
| `formatDate` | `{{formatDate date}}` | Fecha larga en español, por ejemplo `22 de octubre de 2026`. |
| `eq` | `{{#if (eq kind "references")}}…{{/if}}` | Comparación estricta para condicionales. |

Si una plantilla usa `{{title}}` directamente en lugar de `field`, el valor se muestra vacío cuando falta; para obtener el marcador visible usá `field`.

### Página y numeración

El tamaño y los márgenes se definen en `template.css` con `@page`:

```css
@page {
  size: 215.9mm 279.4mm; /* Carta */
  margin: 25.4mm;
}
```

Usar milímetros evita diferencias de redondeo con Chromium. El renderer añade una regla para `.pagedjs_page::after` basada en `numbering`; no es necesario escribirla en la plantilla. Cada hoja recibe `data-page-label` y Paged.js calcula el total.

### Crear, duplicar e importar

Desde **Plantillas** podés:

- **Nueva plantilla**: crea una plantilla local con un HTML/CSS inicial.
- **Duplicar**: copia una plantilla integrada o local para editarla.
- **Importar JSON**: acepta el paquete exportado con `{ id, meta, html, css }`.
- **Importar carpeta**: selecciona una carpeta con `template.json`, `template.html` y `template.css`.
- **Exportar**: descarga un JSON con metadatos, HTML y CSS.

También podés copiar manualmente una carpeta a `.data/templates/<id>/`; aparecerá al recargar la lista.

### Imágenes

En el editor, **Subir imagen** guarda el archivo en `.data/uploads/` y devuelve una URL local como `/api/assets/<uuid>.svg`. Podés usarla en el HTML o en el front matter (`affiliation.logo`). Se admiten PNG, JPG, WEBP, GIF y SVG de hasta 5 MB.

## API

| Ruta | Método | Descripción |
| --- | --- | --- |
| `/api/health` | GET | Comprueba que el servidor está vivo. |
| `/api/templates` | GET | Lista las plantillas integradas y locales. |
| `/api/templates` | POST | Crea una plantilla local con `{ meta, html, css }`. |
| `/api/templates/[id]` | GET | Devuelve una plantilla completa. |
| `/api/templates/[id]` | PUT | Actualiza una plantilla local. |
| `/api/templates/[id]` | DELETE | Elimina una plantilla local. |
| `/api/templates/[id]/duplicate` | POST | Duplica una plantilla. |
| `/api/templates/[id]/export` | GET | Exporta el paquete JSON. |
| `/api/templates/import` | POST | Importa un paquete JSON. |
| `/api/assets` | POST | Sube una imagen multipart en el campo `file`. |
| `/api/assets/[id]` | GET | Sirve una imagen local. |
| `/api/sample` | GET | Devuelve el fixture APA para la vista previa del editor. |
| `/api/render` | POST | Valida, guarda un trabajo y devuelve `{ token, url, warnings, filename, title, template, data }`. |
| `/api/pdf` | POST | Genera y devuelve el PDF como adjunto. |
| `/print/[token]` | GET | HTML paginable que consume Paged.js. |

Cuerpo de ejemplo para `/api/render` y `/api/pdf` usando una plantilla guardada:

```json
{
  "markdown": "---\ntitle: \"Mi informe\"\n---\n\n## Introducción\n\nTexto.",
  "template": "apa7",
  "overrides": {
    "author.name": "Nombre corregido"
  }
}
```

Para previsualizar una plantilla que todavía no se guardó, enviá `templateDraft` con los metadatos y el HTML/CSS:

```json
{
  "markdown": "---\ntitle: \"Mi informe\"\n---\n\n## Introducción\n\nTexto.",
  "templateDraft": {
    "name": "Borrador",
    "description": "",
    "fields": [],
    "sections": {
      "abstract": ["Resumen"],
      "references": ["Referencias"],
      "appendix": ["Anexo"]
    },
    "numbering": {
      "enabled": false,
      "format": "{{page}}",
      "position": "top-right",
      "skipFirstPage": false,
      "fontSize": 12,
      "fontFamily": "serif",
      "color": "#000000"
    },
    "filenamePattern": "{{title}}",
    "html": "<main class=\"doc\">{{{content}}}</main>",
    "css": "@page { size: 215.9mm 279.4mm; margin: 25.4mm; }"
  }
}
```

`overrides` es opcional y permite corregir campos del front matter sin modificar el archivo.

## Arquitectura

```text
Markdown + YAML
      │
      ├─ lib/render/frontmatter.ts    → datos, overrides, validación y nombre
      ├─ lib/render/markdown.ts       → markdown-it, KaTeX, highlight.js, secciones
      └─ lib/render/html-template.ts  → Handlebars + template.html + template.css
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
- **Chromium** imprime con el tamaño exacto definido en `@page` (Carta = 612 × 792 pt) y sin márgenes adicionales.
- **Trabajos de render:** guardan el Markdown y una instantánea de la plantilla usada, para que la vista previa y el PDF sigan coincidiendo aunque la plantilla cambie después.

## Estructura del proyecto

```text
app/
  api/assets/route.ts
  api/assets/[id]/route.ts
  api/health/route.ts
  api/pdf/route.ts
  api/render/route.ts
  api/sample/route.ts
  api/templates/route.ts
  api/templates/[id]/route.ts
  api/templates/[id]/duplicate/route.ts
  api/templates/[id]/export/route.ts
  api/templates/import/route.ts
  print/[token]/route.ts
  page.tsx
  templates/page.tsx
  templates/[id]/page.tsx
components/
  home.tsx
  template-editor.tsx
  template-list.tsx
lib/
  api/render-request.ts
  pdf/chromium.ts
  render/{frontmatter,html-template,markdown}.ts
  store/render-store.ts
  template/{model,starter,store}.ts
  utils/text.ts
templates/
  apa7/{template.json,template.html,template.css}
fixtures/
  apa-demo.md
public/
  samples/
scripts/
  copy-vendor.mjs
  render-sample.ts
docs/adr/
```

Los renders temporales se guardan en `.data/render/`, las plantillas locales en `.data/templates/` y las imágenes en `.data/uploads/`. Esas carpetas, `artifacts/` y `public/vendor/` están ignoradas por Git.

## Pruebas y CI

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run pdf:sample -- --start
```

`npm run pdf:sample -- --start` compila, arranca el servidor, genera `artifacts/demo-apa.pdf`, extrae el texto y verifica:

- que estén las secciones y datos esperados;
- que el PDF tenga exactamente 11 páginas;
- que todas las páginas usen `MediaBox [0 0 612 792]`.

El workflow de GitHub Actions (`.github/workflows/ci.yml`) ejecuta typecheck, lint, pruebas, build y la generación del PDF de muestra, y publica el PDF como artefacto.

## Privacidad

La aplicación está pensada para ejecutarse localmente. No envía documentos a ningún servicio externo. El Markdown, las plantillas y las imágenes se procesan y guardan en la misma máquina.

## Hoja de ruta

- **v0.1.0:** motor de render, plantilla APA 7, vista previa y PDF. ✅
- **v0.2.0:** plantillas HTML/CSS editables, Handlebars, importación/exportación y editor. ✅
- **Próximo:** biblioteca local de documentos con SQLite/Drizzle y más plantillas por asignatura.
- **Futuro:** cuentas, sincronización opcional con Supabase y control de versiones de plantillas.

## Decisiones de diseño

Las decisiones importantes están documentadas en [`docs/adr/`](docs/adr/):

- [ADR 0001: motor único de render](docs/adr/0001-motor-unico-de-render.md)
- [ADR 0002: plantillas declarativas y versionadas](docs/adr/0002-plantillas-declarativas.md) — superado por el ADR 0005
- [ADR 0003: persistencia local y migración a Supabase](docs/adr/0003-persistencia-local.md)
- [ADR 0004: entrega local y CI con PDF de prueba](docs/adr/0004-entrega-y-ci.md)
- [ADR 0005: plantillas HTML/CSS con Handlebars](docs/adr/0005-plantillas-html-css.md)
