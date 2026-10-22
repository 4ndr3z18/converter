import Handlebars from "handlebars";
import {
  applyOverrides,
  buildFilenameFromPattern,
  getValue,
  parseFrontMatter,
  validateTemplateFields,
  type DocumentData,
  type RenderIssue,
} from "@/lib/render/frontmatter";
import { parseMarkdown, type HeadingEntry } from "@/lib/render/markdown";
import type { TemplateRecord } from "@/lib/template/model";
import {
  asText,
  escapeAttribute,
  escapeHtml,
  formatLongDate,
  normalizeTitle,
} from "@/lib/utils/text";

export type BuildHtmlDocumentInput = {
  markdown: string;
  template: TemplateRecord;
  overrides?: Record<string, unknown>;
};

export type BuiltHtmlDocument = {
  html: string;
  documentHtml: string;
  css: string;
  warnings: RenderIssue[];
  data: DocumentData;
  title: string;
  author: string;
  filename: string;
  headings: HeadingEntry[];
};

export type HtmlAnalysis = {
  data: DocumentData;
  body: string;
  warnings: RenderIssue[];
  title: string;
  author: string;
  filename: string;
};

type SectionKind = "abstract" | "references" | "appendix" | "body";

type SectionContext = {
  title: string;
  slug: string;
  level: number;
  html: Handlebars.SafeString;
  bodyHtml: Handlebars.SafeString;
  headings: HeadingEntry[];
  kind: SectionKind;
  isAbstract: boolean;
  isReferences: boolean;
  isAppendix: boolean;
  isBody: boolean;
};

export function analyzeHtmlDocument(
  markdown: string,
  template: TemplateRecord,
  overrides?: Record<string, unknown>,
): HtmlAnalysis {
  const frontMatter = parseFrontMatter(markdown);
  const data = applyOverrides(frontMatter.data, overrides);
  const warnings = [
    ...frontMatter.issues,
    ...validateTemplateFields(template.meta.fields, data),
  ];

  return {
    data,
    body: frontMatter.body,
    warnings,
    title: asText(getValue(data, "title")),
    author: asText(getValue(data, "author.name")),
    filename: buildFilenameFromPattern(template.meta.filenamePattern, data),
  };
}

function sectionKind(title: string, template: TemplateRecord): SectionKind {
  const normalized = normalizeTitle(title);
  const abstractTitles = new Set(
    template.meta.sections.abstract.map(normalizeTitle),
  );
  const referenceTitles = new Set(
    template.meta.sections.references.map(normalizeTitle),
  );
  const appendixTitles = template.meta.sections.appendix.map(normalizeTitle);

  if (abstractTitles.has(normalized)) return "abstract";
  if (referenceTitles.has(normalized)) return "references";
  if (
    /^(anexo|apéndice|apendice|appendix)\b/i.test(title.trim()) ||
    appendixTitles.some((candidate) => normalized.startsWith(candidate))
  ) {
    return "appendix";
  }
  return "body";
}

function pageScript(
  pageNumberFormat: string,
  pageNumberEnabled: boolean,
): string {
  return `<script>
window.PagedConfig = {
  auto: true,
  before: function () {
    return document.fonts.ready.then(function () {});
  },
  after: function () {
    try {
      var pages = document.querySelectorAll('.pagedjs_page');
      var total = pages.length;
      var format = ${JSON.stringify(pageNumberFormat)};

      pages.forEach(function (pageElement, index) {
        if (${pageNumberEnabled ? "true" : "false"}) {
          pageElement.setAttribute(
            'data-page-label',
            format
              .replace(/\\{\\{\\s*page\\s*\\}\\}/g, String(index + 1))
              .replace(/\\{\\{\\s*pages\\s*\\}\\}/g, String(total))
          );
        }
      });

      document.querySelectorAll('.toc a[href^="#"]').forEach(function (link) {
        var id = decodeURIComponent(link.getAttribute('href').slice(1));
        var target = document.getElementById(id);
        var page = target && target.closest('.pagedjs_page');
        var number = page && page.getAttribute('data-page-number');
        var slot = link.querySelector('.toc-page-number');
        if (slot && number) slot.textContent = number;
      });
    } catch (error) {
      window.__PAGED_ERROR__ = String(error);
    }
    window.__PAGED_READY__ = true;
  }
};

setTimeout(function () {
  if (!window.__PAGED_READY__) {
    window.__PAGED_ERROR__ = 'timeout';
    window.__PAGED_READY__ = true;
  }
}, 45000);
</script>
<script src="/vendor/paged/paged.polyfill.min.js"></script>`;
}

function numberingCss(template: TemplateRecord): string {
  const { numbering } = template.meta;
  if (!numbering.enabled) return "";

  const vertical = numbering.position.startsWith("top")
    ? "top: 12.7mm;"
    : "bottom: 12.7mm;";
  const horizontal = numbering.position.endsWith("left")
    ? "left: var(--pagedjs-margin-left, 25.4mm);"
    : numbering.position.endsWith("right")
      ? "right: var(--pagedjs-margin-right, 25.4mm);"
      : "left: 50%; transform: translateX(-50%);";
  const align = numbering.position.endsWith("left")
    ? "left"
    : numbering.position.endsWith("right")
      ? "right"
      : "center";

  return `
.pagedjs_page {
  position: relative;
}

.pagedjs_page::after {
  content: attr(data-page-label);
  position: absolute;
  ${vertical}
  ${horizontal}
  text-align: ${align};
  font-family: ${numbering.fontFamily};
  font-size: ${numbering.fontSize}pt;
  line-height: 1;
  color: ${numbering.color};
  white-space: nowrap;
  pointer-events: none;
}
${
  numbering.skipFirstPage
    ? ".pagedjs_page:first-child::after { content: none; }"
    : ""
}
`;
}

const BASE_CSS = `
@page {
  size: 215.9mm 279.4mm;
  margin: 25.4mm;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #e6e9ee;
}

img {
  max-width: 100%;
  height: auto;
}

table {
  border-collapse: collapse;
}

pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.katex-display {
  overflow-x: auto;
}

.missing {
  color: #5c5c5c;
}

@media print {
  html,
  body {
    background: #ffffff;
    margin: 0;
  }

  .pagedjs_pages {
    display: block;
  }

  .pagedjs_page {
    margin: 0 !important;
    box-shadow: none !important;
    break-after: page;
    page-break-after: always;
  }

  .pagedjs_page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
}
`;

function createHandlebars(template: TemplateRecord, data: DocumentData) {
  const hb = Handlebars.create();

  hb.registerHelper("field", (...args: unknown[]) => {
    const key = asText(args[0]);
    const label = asText(args[1]) || key;
    const third = args[2];
    const explicitRequired =
      typeof third === "boolean" ? third : undefined;
    const field = template.meta.fields.find((entry) => entry.key === key);
    const required = explicitRequired ?? field?.required ?? false;
    const value = asText(getValue(data, key));

    if (value) return new hb.SafeString(escapeHtml(value));
    if (!required) return "";

    return new hb.SafeString(
      `<span class="missing">[Falta: ${escapeHtml(label)}]</span>`,
    );
  });

  hb.registerHelper("formatDate", (value: unknown) => formatLongDate(value));
  hb.registerHelper("eq", (left: unknown, right: unknown) => left === right);

  return hb;
}

export function buildHtmlDocument(
  input: BuildHtmlDocumentInput,
): BuiltHtmlDocument {
  const { template } = input;
  const analysis = analyzeHtmlDocument(
    input.markdown,
    template,
    input.overrides,
  );
  const parsed = parseMarkdown(analysis.body, {
    figureCaptionPosition: "above",
  });

  const abstractTitles = new Set(
    template.meta.sections.abstract.map(normalizeTitle),
  );

  const sections: SectionContext[] = parsed.sections.map((section) => {
    const kind = sectionKind(section.title, template);
    return {
      title: section.title,
      slug: section.slug,
      level: section.level,
      html: new Handlebars.SafeString(section.html),
      bodyHtml: new Handlebars.SafeString(section.bodyHtml),
      headings: section.headings,
      kind,
      isAbstract: kind === "abstract",
      isReferences: kind === "references",
      isAppendix: kind === "appendix",
      isBody: kind === "body",
    };
  });

  const abstractSections = sections.filter((section) => section.isAbstract);
  const referenceSections = sections.filter(
    (section) => section.isReferences,
  );
  const appendixSections = sections.filter((section) => section.isAppendix);
  const bodySections = sections.filter((section) => section.isBody);
  const abstractSection = abstractSections[0] ?? null;

  const rawKeywords = getValue(analysis.data, "keywords");
  const keywords = asText(rawKeywords);

  const abstract = abstractSection
    ? {
        title: abstractSection.title,
        html: abstractSection.bodyHtml,
        keywords,
        keywordsLabel: "Palabras clave",
      }
    : null;

  const wrappedSections = sections.map((section) => {
    const classes = ["doc-section"];
    if (section.isReferences) classes.push("references-section");
    if (section.isAppendix) classes.push("appendix-section");
    return `<section class="${classes.join(" ")}" data-section="${escapeAttribute(
      section.slug,
    )}">${section.html}</section>`;
  });

  const preamble = parsed.preambleHtml.trim()
    ? `<section class="doc-section" data-section="preambulo">${parsed.preambleHtml}</section>`
    : "";

  const contentHtml = [preamble, ...wrappedSections].filter(Boolean).join("\n");
  const toc = parsed.headings.filter(
    (heading) => !abstractTitles.has(normalizeTitle(heading.text)),
  );

  const hb = createHandlebars(template, analysis.data);
  const context = {
    ...analysis.data,
    frontMatter: analysis.data,
    data: analysis.data,
    content: new hb.SafeString(contentHtml),
    preamble: new hb.SafeString(preamble),
    sections,
    bodySections,
    referenceSections,
    appendixSections,
    abstractSections,
    abstract,
    references: referenceSections[0] ?? null,
    toc,
    title: analysis.title,
    authorName: analysis.author,
    dateLong: formatLongDate(getValue(analysis.data, "date")),
    keywords,
    templateMeta: template.meta,
    templateFields: template.meta.fields,
  };

  const render = hb.compile(template.html, { noEscape: false });
  const documentHtml = render(context);

  const css = `${BASE_CSS}\n${numberingCss(template)}\n${template.css}`;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="${escapeAttribute(analysis.author)}">
  <title>${escapeHtml(analysis.title || "Documento")}</title>
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/vendor/katex/katex.min.css">
  <link rel="stylesheet" href="/vendor/highlight/github.min.css">
  <style>
${css}
  </style>
</head>
<body>
${documentHtml}
${pageScript(
  template.meta.numbering.format,
  template.meta.numbering.enabled,
)}
</body>
</html>`;

  return {
    html,
    documentHtml,
    css,
    warnings: analysis.warnings,
    data: analysis.data,
    title: analysis.title,
    author: analysis.author,
    filename: analysis.filename,
    headings: parsed.headings,
  };
}
