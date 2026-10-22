# ADR 0004 — Entrega local y CI con PDF de prueba

- **Estado:** aceptado
- **Fecha:** 2026-10-22

## Contexto

El proyecto se distribuye como una aplicación local. Aun así, necesita una verificación reproducible de que el motor de render sigue produciendo un PDF válido, con la maqueta y el contenido esperados. Las pruebas unitarias no cubren la paginación real de Chromium.

## Decisión

- La aplicación se ejecuta con `npm run dev` o `npm run build && npm start`.
- El repositorio público `4ndr3z18/converter` usa una rama por fase, PR hacia `main` y un tag por entrega.
- GitHub Actions ejecuta:
  1. `npm ci`;
  2. instalación de Chromium;
  3. `npm run typecheck`;
  4. `npm run lint`;
  5. `npm test`;
  6. `npm run build`;
  7. `npm run pdf:sample -- --start`;
  8. publicación de `artifacts/demo-apa.pdf` como artefacto.
- Los fixtures usan datos ficticios. No se versionan documentos reales, PDFs ni secretos.
- La verificación del PDF comprueba contenido, exactamente 11 páginas y `MediaBox [0 0 612 792]` en todas las hojas.

## Consecuencias

- Cada PR demuestra que el PDF se genera y contiene las secciones esperadas.
- El artefacto queda disponible para revisión visual sin ejecutar la app.
- La CI necesita Chromium y tarda más que una suite unitaria; por eso el PDF de muestra se genera una sola vez por ejecución.
- El repositorio público permite usar la protección de rama y los minutos de Actions sin costo.

## Referencias

- `.github/workflows/ci.yml`
- `scripts/render-sample.ts`
- `fixtures/apa-demo.md`
