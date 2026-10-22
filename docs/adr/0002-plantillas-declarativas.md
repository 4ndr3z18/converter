# ADR 0002 — Plantillas declarativas y versionadas

- **Estado:** superado por el [ADR 0005](0005-plantillas-html-css.md)
- **Fecha:** 2026-10-22

> **Nota de reemplazo (2026-10-22):** esta decisión describía el esquema declarativo de la v0.1.0. La v0.2.0 reemplazó ese esquema por plantillas HTML/CSS editables con Handlebars. El ADR se conserva como registro histórico.

## Contexto

Cada asignatura puede necesitar una identidad visual distinta: colores, tipografía, portada, cabecera, pie, tamaño de página o campos obligatorios. Si esas variaciones se implementan con condicionales en el código, el render se vuelve frágil y cada plantilla nueva obliga a tocar el motor.

## Decisión

Representar cada plantilla como un objeto JSON validado con Zod (`lib/template/schema.ts`). La plantilla describe:

- tamaño y orientación de página, márgenes;
- colores y tipografía;
- encabezados por nivel de Markdown;
- portada y campos que se muestran;
- resumen, índice, cabecera, pie y numeración;
- referencias, tablas, figuras, citas y marca de agua;
- el contrato de campos del front matter (`key`, `label`, `required`, `type`, `example`).

El CSS se genera a partir de la plantilla en `lib/template/css.ts`. Para crear una plantilla nueva se duplica el preset, se cambia su `slug` y se registra en `lib/template/presets/index.ts`.

## Consecuencias

- Añadir una identidad visual no requiere cambios en el parser ni en el render.
- El esquema funciona como documentación viva y como validación en tiempo de ejecución.
- Las plantillas se pueden versionar y, más adelante, guardar en base de datos o compartir como JSON.
- Un cambio de esquema exige migrar las plantillas existentes; por eso el esquema incluye `schemaVersion`.

## Reglas de compatibilidad

- `schemaVersion: 1` es obligatorio.
- Los campos nuevos deben ser opcionales o tener un valor por defecto.
- Los cambios incompatibles suben `schemaVersion` y se documentan en el CHANGELOG.

## Referencias

- `lib/template/schema.ts`
- `lib/template/presets/apa7.ts`
- `lib/template/css.ts`
