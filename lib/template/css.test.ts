import { describe, expect, it } from "vitest";
import { buildDocumentCss } from "@/lib/template/css";
import { APA7_TEMPLATE } from "@/lib/template/presets/apa7";
import { parseTemplate } from "@/lib/template/schema";

function buildCss(overrides: Record<string, unknown> = {}): string {
  const template = parseTemplate({ ...APA7_TEMPLATE, ...overrides });

  return buildDocumentCss(template, {
    resolve: (key) => (key === "title" ? "Informe de prueba" : null),
  });
}

describe("CSS de página", () => {
  it("declara el tamaño Carta y los márgenes APA", () => {
    const css = buildCss();

    expect(css).toContain("size: 215.9mm 279.4mm;");
    expect(css).toContain("margin: 25.4mm 25.4mm 25.4mm 25.4mm;");
  });

  it("no anula los márgenes dentro de @media print", () => {
    const css = buildCss();

    expect(css).not.toMatch(/@media print\s*\{\s*@page/);
    expect(css).not.toMatch(/@page\s*\{[^}]*margin:\s*0\s*;/);
  });

  it("numera cada hoja con data-page-label alineado al margen derecho", () => {
    const css = buildCss();

    expect(css).toContain(".pagedjs_page::after");
    expect(css).toContain("content: attr(data-page-label);");
    expect(css).toContain("right: 25.4mm;");
    expect(css).toContain("font-size: 12pt;");
  });

  it("omite el número de página cuando está desactivado", () => {
    const css = buildCss({
      chrome: {
        ...APA7_TEMPLATE.chrome,
        pageNumber: { ...APA7_TEMPLATE.chrome.pageNumber, enabled: false },
      },
    });

    expect(css).not.toContain(".pagedjs_page::after");
  });

  it("oculta el número en la primera hoja si se solicita", () => {
    const css = buildCss({
      chrome: {
        ...APA7_TEMPLATE.chrome,
        pageNumber: { ...APA7_TEMPLATE.chrome.pageNumber, skipFirstPage: true },
      },
    });

    expect(css).toContain(".pagedjs_page:first-child::after { content: none; }");
  });
});

describe("CSS de contenido", () => {
  it("fuerza el cuerpo a empezar en una página nueva tras el resumen", () => {
    const css = buildCss();

    expect(css).toMatch(/\.abstract-page\s*\{[^}]*break-after:\s*page/);
  });

  it("aplica sangría francesa a las referencias en párrafos y listas", () => {
    const css = buildCss();

    expect(css).toMatch(/\.references-section p\s*\{[^}]*text-indent:\s*-12\.7mm/);
    expect(css).toMatch(/\.references-section li\s*\{[^}]*text-indent:\s*-12\.7mm/);
  });

  it("usa Times New Roman 12 pt con interlineado doble", () => {
    const css = buildCss();

    expect(css).toContain('"Times New Roman", Tinos');
    expect(css).toContain("font-size: 12pt;");
    expect(css).toContain("line-height: 2;");
  });

  it("incluye las reglas APA de tablas", () => {
    const css = buildCss();

    expect(css).toMatch(/\.doc\.tables-apa table\s*\{[^}]*border-top:\s*1pt solid/);
    expect(css).toMatch(/\.doc\.tables-apa thead th\s*\{[^}]*border-bottom:\s*1pt solid/);
  });
});

describe("cabeceras, pies y marca de agua", () => {
  it("genera los margin boxes de la cabecera", () => {
    const css = buildCss({
      chrome: {
        ...APA7_TEMPLATE.chrome,
        header: {
          ...APA7_TEMPLATE.chrome.header,
          enabled: true,
          center: "{{title}}",
        },
      },
    });

    expect(css).toContain("@top-center");
    expect(css).toContain('content: "Informe de prueba";');
  });

  it("oculta la cabecera en la primera página si se solicita", () => {
    const css = buildCss({
      chrome: {
        ...APA7_TEMPLATE.chrome,
        header: {
          ...APA7_TEMPLATE.chrome.header,
          enabled: true,
          center: "{{title}}",
          skipFirstPage: true,
        },
      },
    });

    expect(css).toContain("@page :first { @top-center { content: none; } }");
  });

  it("añade la imagen de marca de agua cuando está disponible", () => {
    const template = parseTemplate({
      ...APA7_TEMPLATE,
      watermark: { ...APA7_TEMPLATE.watermark, enabled: true, text: "BORRADOR" },
    });
    const css = buildDocumentCss(template, {
      resolve: () => null,
      watermarkDataUri: "data:image/svg+xml;charset=utf-8,%3Csvg%3E",
    });

    expect(css).toContain("background-image: url(");
    expect(css).not.toContain("BORRADOR");
  });
});
