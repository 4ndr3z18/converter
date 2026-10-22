# ADR 0003 — Persistencia local ahora, Supabase después

- **Estado:** aceptado
- **Fecha:** 2026-10-22

## Contexto

El producto debe funcionar sin conexión y sin depender de un servicio externo. Al mismo tiempo, se prevé una etapa con cuentas, sincronización y acceso desde varios dispositivos. La persistencia no debería filtrarse a la lógica de render.

## Decisión

- En la Fase 0, los trabajos de render se guardan en disco dentro de `.data/renders/` mediante `lib/store/render-store.ts`.
- La API de render (`prepareRender`) consume una función `createRenderJob` y no conoce el almacenamiento.
- En la Fase 1 se reemplaza ese módulo por SQLite con Drizzle, manteniendo la misma interfaz.
- La migración posterior a Supabase reutilizará el repositorio y el esquema de datos, sin cambiar el motor de render.

## Consecuencias

- La instalación local no necesita servidor de base de datos.
- Los datos no salen de la máquina.
- El almacenamiento en disco debe limpiar renders antiguos; la política de retención se define en Fase 1.
- Las pruebas del motor no dependen de la base de datos.

## Referencias

- `lib/store/render-store.ts`
- `lib/api/render-request.ts`
- `app/api/render/route.ts`
