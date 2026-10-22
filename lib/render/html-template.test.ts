import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildHtmlDocument } from "@/lib/render/html-template";
import { templateMetaSchema } from "@/lib/template/model";
import { getTemplate } from "@/lib/template/store";
import type { TemplateRecord } from "@/lib/template/model";

const fixture = readFileSync(
  path.join(process.cwd(), "fixtures", "apa-demo.md"),
  "utf8",
);

function customTemplate(
  metaInput: Record<string, unknown>,
  html: string,
  css = "body { font-family: serif; }",
): TemplateRecord {
  return {
    id: "prueba",
    builtin: false,
    meta: templateMetaSchema.parse(metaInput),
    html,
    css,
    updatedAt: Date.now(),
  };
}

describe("buildHtmlDocument", () => {
  it("renderiza la plantilla APA con el fixture verificado", async () => {
    const template = await getTemplate("apa7");
    expect(template).not.toBeNull();

    const built = buildHtmlDocument({ markdown: fixture, template: template! });

    expect(built.title).toContain("Adopción de herramientas");
    expect(built.author).toBe("Pérez Quispe, Ana Lucía");
    expect(built.filename).toBe(
      "Informe de investigación - Pérez Quispe, Ana Lucía.pdf",
    );
    expect(built.warnings).toEqual([]);
    expect(built.headings.length).toBeGreaterThan(10);

    expect(built.documentHtml).toContain('class="cover"');
    expect(built.documentHtml).toContain('class="abstract-page"');
    expect(built.documentHtml).toContain("Palabras clave");
    expect(built.documentHtml).toContain("references-section");
    expect(built.documentHtml).toContain("appendix-section");
    expect(built.documentHtml).toContain("22 de octubre de 2026");
    expect(built.documentHtml).toContain("body-title");

    expect(built.html).toContain("/vendor/paged/paged.polyfill.min.js");
    expect(built.html).toContain("data-page-label");
    expect(built.html).toContain('content: attr(data-page-label)');
    expect(built.html).toContain("--pagedjs-margin-right");
    expect(built.css).toContain("size: 215.9mm 279.4mm");
  });

  it("inserta el contenido Markdown sin escaparlo", () => {
    const template = customTemplate(
      {
        name: "Prueba",
        fields: [],
        numbering: { enabled: false },
      },
      `<main class="doc"><h1>{{title}}</h1><div class="content">{{content}}</div></main>`,
    );

    const built = buildHtmlDocument({
      markdown: `---
title: "Mi documento"
---

## Introducción

Texto con **negrita** y una tabla.

| A | B |
|---|---|
| 1 | 2 |
`,
      template,
    });

    expect(built.documentHtml).toContain("<strong>negrita</strong>");
    expect(built.documentHtml).toContain("<table>");
    expect(built.documentHtml).toContain("Introducción");
    expect(built.html).not.toContain("content: attr(data-page-label)");
  });

  it("escapa los valores del front matter y marca los obligatorios faltantes", () => {
    const template = customTemplate(
      {
        name: "Prueba",
        fields: [
          { key: "title", label: "título", required: true },
          { key: "author.name", label: "autor", required: false },
        ],
        numbering: { enabled: false },
      },
      `<main><h1>{{field "title" "título"}}</h1><p>{{author.name}}</p></main>`,
    );

    const built = buildHtmlDocument({
      markdown: `---
author:
  name: "<Ana>"
---
`,
      template,
    });

    expect(built.warnings.map((warning) => warning.field)).toContain("title");
    expect(built.documentHtml).toContain("[Falta: título]");
    expect(built.documentHtml).toContain("&lt;Ana&gt;");
    expect(built.documentHtml).not.toContain("<Ana>");
  });

  it("clasifica resumen, referencias y anexos para las plantillas", async () => {
    const template = await getTemplate("apa7");
    const built = buildHtmlDocument({ markdown: fixture, template: template! });

    const bodyCount = (built.documentHtml.match(/class="doc-section"/g) ?? [])
      .length;
    expect(bodyCount).toBeGreaterThan(0);
    expect(built.documentHtml).toContain('data-section="referencias"');
    expect(built.documentHtml).toContain('data-section="anexos"');
  });
});
