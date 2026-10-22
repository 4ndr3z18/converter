# ADR 0005 — Plantillas HTML/CSS con Handlebars

- **Estado:** aceptado
- **Fecha:** 2026-10-22
- **Reemplaza a:** [ADR 0002](0002-plantillas-declarativas.md)

## Contexto

El esquema declarativo de la v0.1.0 cubría una plantilla APA concreta, pero cada nueva identidad visual obligaba a añadir opciones al esquema, al generador de CSS y al render. Eso hacía difícil crear portadas, maquetas o composiciones que no estuvieran previstas en el código.

El producto necesita que una persona pueda crear y editar plantillas sin modificar TypeScript, y que la vista previa y el PDF sigan usando exactamente el mismo HTML/CSS.

## Decisión

Una plantilla es una carpeta con tres archivos:

```text
<id>/
  template.json   # metadatos y contrato de campos
  template.html   # estructura Handlebars
  template.css    # estilos, incluido @page
```

- Las plantillas integradas viven en `templates/` y son de solo lectura.
- Las plantillas locales viven en `.data/templates/` y se pueden crear, editar, duplicar, importar, exportar y eliminar.
- El render usa una instancia aislada de Handlebars con `field`, `formatDate` y `eq`.
- El contexto expone el front matter, `content`, `preamble`, las secciones separadas (`bodySections`, `referenceSections`, `appendixSections`, `abstractSections`), `abstract`, `toc` y metadatos de la plantilla.
- Los valores del front matter se escapan por defecto; el HTML ya generado se inserta con triple llave.
- El tamaño y los márgenes se definen en `template.css` con `@page`. Chromium obtiene el pagebox real de Paged.js.
- La numeración se configura en `template.json`; el renderer inyecta la regla `.pagedjs_page::after` y Paged.js escribe `data-page-label` en cada hoja.
- Las imágenes subidas se guardan en `.data/uploads/` y se referencian con `/api/assets/<id>.<ext>`.

La plantilla APA 7 se portó a `templates/apa7/` y se conserva como plantilla integrada.

## Consecuencias

- Quien crea una plantilla tiene control total sobre la maqueta sin tocar el motor.
- El formato es portable: una carpeta o un JSON exportado se puede compartir e importar.
- La validación de campos obligatorios depende de `fields` en `template.json`; los marcadores visibles se obtienen usando el helper `field`.
- La seguridad recae en el contrato: el HTML de la plantilla es de confianza local, mientras que los datos del documento se escapan.
- Cambiar una plantilla no altera documentos ya preparados porque cada trabajo guarda una instantánea de la plantilla usada.
- El esquema declarativo y el generador de CSS anteriores se eliminan; no hay migración automática de presets porque solo existía la plantilla APA.

## Alternativas descartadas

- **Ampliar el esquema declarativo:** seguía limitando la maqueta y acumulaba opciones difíciles de mantener.
- **Plantillas como componentes React:** obliga a compilar código para cada cambio y no permite editar desde el navegador.
- **Motores de plantillas con lógica arbitraria:** Handlebars cubre condicionales y bucles con una superficie más acotada.
- **Guardar plantillas solo en JSON:** el HTML/CSS embebido es útil para exportar, pero una carpeta facilita editar los archivos por separado.

## Referencias

- `lib/template/model.ts`
- `lib/template/store.ts`
- `lib/render/html-template.ts`
- `templates/apa7/template.json`
- `templates/apa7/template.html`
- `templates/apa7/template.css`
- `components/template-editor.tsx`
