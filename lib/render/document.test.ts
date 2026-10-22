import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lib/render/document";
import { APA7_TEMPLATE } from "@/lib/template/presets/apa7";

const FRONT_MATTER = `---
title: "Adopción de IA en equipos universitarios"
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
keywords: "inteligencia artificial, gestión de proyectos"
---
`;

const BODY = `
## Resumen

Este es el resumen del informe con los hallazgos principales.

## Introducción

Texto introductorio del informe.

## Referencias

García, M. (2023). Título de prueba. Editorial.
`;

function build(markdown = `${FRONT_MATTER}${BODY}`, overrides?: Record<string, unknown>) {
  return buildDocument({
    markdown,
    template: APA7_TEMPLATE,
    overrides,
  });
}

describe("buildDocument", () => {
  it("construye la portada, el resumen y el cuerpo", () => {
    const built = build();

    expect(built.title).toBe("Adopción de IA en equipos universitarios");
    expect(built.author).toBe("Pérez Quispe, Ana Lucía");
    expect(built.documentHtml).toContain('class="cover"');
    expect(built.documentHtml).toContain("Universidad Nacional de Ejemplo");
    expect(built.documentHtml).toContain('class="abstract-page"');
    expect(built.documentHtml).toContain("Palabras clave:");
    expect(built.documentHtml).toContain("Texto introductorio del informe.");
    expect(built.documentHtml).toContain("Título de prueba. Editorial.");
    expect(built.documentHtml).toContain('class="doc-section references-section"');
  });

  it("no reporta incidencias cuando el front matter está completo", () => {
    expect(build().warnings).toEqual([]);
  });

  it("genera un HTML completo con Paged.js y etiquetas de página", () => {
    const built = build();

    expect(built.html).toContain("<!doctype html>");
    expect(built.html).toContain("window.PagedConfig");
    expect(built.html).toContain("auto: true");
    expect(built.html).toContain("data-page-label");
    expect(built.html).toContain("paged.polyfill.min.js");
    expect(built.html).toContain("{{page}}");
    expect(built.html).toContain(".replace(/\\{\\{page\\}\\}/g");
  });

  it("usa las dimensiones Carta de la plantilla", () => {
    expect(build().dimensions).toEqual({ width: 215.9, height: 279.4 });
  });

  it("genera el nombre de archivo desde el patrón", () => {
    expect(build().filename).toBe(
      "Informe de investigación - Pérez Quispe, Ana Lucía.pdf",
    );
  });

  it("avisa de los campos obligatorios ausentes y deja marcadores", () => {
    const markdown = `---
report_type: "Informe de investigación"
author:
  name: "Pérez Quispe, Ana Lucía"
  id: "20231234"
affiliation:
  university: "Universidad Nacional de Ejemplo"
course:
  name: "Ingeniería de Software"
professor:
  name: "Ramírez Torres, Carlos"
date: "2026-10-22"
---

## Introducción

Texto.
`;
    const built = build(markdown);
    const missing = built.warnings.filter((warning) => warning.code === "missing");

    expect(missing.some((warning) => warning.field === "title")).toBe(true);
    expect(built.documentHtml).toContain("[Falta: título]");
  });

  it("aplica los overrides del formulario antes de validar", () => {
    const built = build(`${FRONT_MATTER}${BODY}`, {
      "author.name": "Nombre Corregido",
      city: "Arequipa",
    });

    expect(built.documentHtml).toContain("Nombre Corregido");
    expect(built.documentHtml).toContain("Arequipa");
    expect(built.warnings).toEqual([]);
  });

  it("omite el resumen cuando la plantilla lo desactiva", () => {
    const template = {
      ...APA7_TEMPLATE,
      abstract: { ...APA7_TEMPLATE.abstract, enabled: false },
    };
    const built = buildDocument({
      markdown: `${FRONT_MATTER}${BODY}`,
      template,
    });

    expect(built.documentHtml).not.toContain('class="abstract-page"');
  });
});
