import type { TemplateMeta } from "@/lib/template/model";

export const STARTER_META: TemplateMeta = {
  name: "Nueva plantilla",
  description: "Plantilla HTML/CSS editable.",
  fields: [
    { key: "title", label: "Título", required: true },
    { key: "author.name", label: "Autor", required: false },
  ],
  sections: {
    abstract: ["Resumen", "Abstract"],
    references: ["Referencias", "References"],
    appendix: ["Anexo", "Apéndice", "Appendix"],
  },
  numbering: {
    enabled: true,
    format: "{{page}}",
    position: "bottom-center",
    skipFirstPage: false,
    fontSize: 10,
    fontFamily: '"Inter", Arial, sans-serif',
    color: "#444444",
  },
  filenamePattern: "{{title}}",
};

export const STARTER_HTML = `<main class="doc">
  <header class="cover">
    <h1>{{field "title" "título"}}</h1>
    {{#if author.name}}<p>{{author.name}}</p>{{/if}}
  </header>

  <section class="content">
    {{content}}
  </section>
</main>
`;

export const STARTER_CSS = `@page {
  size: 215.9mm 279.4mm;
  margin: 25.4mm;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: "Inter", Arial, Helvetica, sans-serif;
  font-size: 11pt;
  line-height: 1.65;
  color: #1f2933;
}

.doc {
  max-width: none;
}

.cover {
  break-after: page;
  page-break-after: always;
  padding-top: 30mm;
  text-align: center;
}

.cover h1 {
  font-size: 22pt;
  line-height: 1.25;
  margin: 0 0 10mm 0;
}

.cover p {
  margin: 0;
  color: #52606d;
}

.content h2 {
  font-size: 15pt;
  margin: 0 0 4mm 0;
}

.content h3 {
  font-size: 12pt;
  margin: 0 0 3mm 0;
}

.content p {
  margin: 0 0 4mm 0;
}

.content table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}

.content th,
.content td {
  border: 0.5pt solid #cbd2d9;
  padding: 4pt 6pt;
  text-align: left;
}

.references-section p {
  padding-left: 12.7mm;
  text-indent: -12.7mm;
}
`;
