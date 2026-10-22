# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado usa [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Por venir

- Persistencia local con SQLite/Drizzle y biblioteca de documentos.
- Más plantillas por asignatura.
- Índice automático con números de página reales para plantillas que lo activen.
- Sincronización opcional con Supabase.

## [0.2.0] — 2026-10-22

### Añadido

- Plantillas HTML/CSS editables con Handlebars: datos, condicionales y bucles.
- Formato de plantilla como carpeta con `template.json`, `template.html` y `template.css`.
- Plantilla APA 7 portada a HTML/CSS, con portada, resumen, tabla, figura, referencias y anexos.
- Store local de plantillas en `.data/templates/`, con plantillas integradas de solo lectura y duplicado.
- Editor de plantillas con CodeMirror 6, pestañas HTML/CSS/Metadatos, vista previa paginada y guardado.
- Pantalla de inicio con botón `+`, arrastrar y soltar archivos `.md`, selector de plantilla, workspace de vista previa y descarga.
- Creación, duplicado, exportación e importación de plantillas en JSON y desde carpetas.
- Subida de imágenes a `.data/uploads/` y servicio local por `/api/assets/...`.
- API CRUD de plantillas, exportación, importación y comprobación del estado del servidor.
- Numeración de páginas configurable por plantilla mediante `data-page-label` y `.pagedjs_page::after`.
- Validación de campos obligatorios con marcadores visibles y avisos en la interfaz.
- Verificación del PDF APA con 11 páginas exactas y `MediaBox [0 0 612 792]`.
- Pruebas del renderizador HTML y del store de plantillas.

### Cambiado

- El render ahora compone Handlebars + HTML/CSS en `lib/render/html-template.ts`.
- Los trabajos de render guardan una instantánea de la plantilla para mantener la coherencia entre vista previa y PDF.
- La documentación, la arquitectura y las rutas de API se actualizaron para el nuevo sistema de plantillas.

### Eliminado

- El esquema declarativo anterior, el generador de CSS, los presets y el laboratorio web antiguo.

## [0.1.0] — 2026-10-22

### Añadido

- Motor de render único: markdown-it → Paged.js → Chromium/Playwright.
- Parseo de front matter YAML con claves anidadas, overrides y validación de campos obligatorios.
- Plantilla APA 7 (versión estudiante): Carta, Times New Roman 12, interlineado doble, márgenes de 25,4 mm, portada institucional, resumen, palabras clave, referencias con sangría francesa, tablas y figuras APA.
- Numeración de páginas por hoja con `data-page-label`, alineada al margen derecho.
- Soporte de GFM, tablas, figuras con leyenda, código resaltado y fórmulas KaTeX.
- Cabeceras, pies, índice y marca de agua configurables por plantilla.
- Vista previa paginada y descarga de PDF desde el laboratorio web.
- Rutas API `/api/health`, `/api/render`, `/api/pdf` y ruta de impresión `/print/[token]`.
- Fixture APA de demostración, logos y figura de ejemplo.
- Pruebas unitarias con Vitest para texto, front matter, esquema, CSS y documento.
- Script `pdf:sample` que genera el PDF y verifica su contenido.
- Workflow de CI con typecheck, lint, pruebas, build y PDF de prueba como artefacto.
- Documentación de arquitectura, uso y decisiones de diseño.

### Corregido

- Los márgenes de la plantilla se perdían porque Paged.js interpretaba el `@page` de `@media print` con `margin: 0`.
- El script de Paged.js marcaba el documento como listo antes de paginar cuando se usaba `auto: false`.
- El PDF se generaba con un tamaño ligeramente mayor que Carta por el redondeo de milímetros de Playwright.
- La fecha ISO del front matter no se mostraba en formato largo en la portada.
- Las referencias en párrafos usaban sangría de primera línea en lugar de sangría francesa.
- El resumen y el cuerpo compartían página.

[Unreleased]: https://github.com/4ndr3z18/converter/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/4ndr3z18/converter/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/4ndr3z18/converter/releases/tag/v0.1.0
