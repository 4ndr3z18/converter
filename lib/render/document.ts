import type { TemplateDefinition } from "@/lib/template/schema";
import { pageDimensions } from "@/lib/template/schema";
import { buildDocumentCss } from "@/lib/template/css";
import {
  asText,
  escapeAttribute,
  escapeHtml,
  normalizeTitle,
  slugify,
} from "@/lib/utils/text";
import {
  applyOverrides,
  buildFilename,
  getValue,
  parseFrontMatter,
  validateRequiredFields,
  type DocumentData,
  type RenderIssue,
} from "@/lib/render/frontmatter";
import {
  parseMarkdown,
  type HeadingEntry,
  type MarkdownSection,
} from "@/lib/render/markdown";

export type BuildDocumentInput = {
  markdown: string;
  template: TemplateDefinition;
  overrides?: Record<string, unknown>;
};

export type BuiltDocument = {
  /** Documento HTML completo, listo para Paged.js y para Playwright. */
  html: string;
  /** Solo el contenido paginable (sin head ni scripts). */
  documentHtml: string;
  css: string;
  warnings: RenderIssue[];
  data: DocumentData;
  title: string;
  author: string;
  filename: string;
  headings: HeadingEntry[];
  dimensions: { width: number; height: number };
};

type Analysis = {
  data: DocumentData;
  body: string;
  warnings: RenderIssue[];
  title: string;
  author: string;
  filename: string;
};

export function analyzeDocument(
  markdown: string,
  template: TemplateDefinition,
  overrides?: Record<string, unknown>,
): Analysis {
  const frontMatter = parseFrontMatter(markdown);
  const data = applyOverrides(frontMatter.data, overrides);
  const warnings = [
    ...frontMatter.issues,
    ...validateRequiredFields(template, data),
  ];

  return {
    data,
    body: frontMatter.body,
    warnings,
    title: asText(getValue(data, "title")),
    author: asText(getValue(data, "author.name")),
    filename: buildFilename(template, data),
  };
}

function missingMarker(template: TemplateDefinition, label: string): string {
  if (!template.cover.showMissingMarkers) return "";
  return `<span class="missing">[Falta: ${escapeHtml(label)}]</span>`;
}

function renderCover(
  template: TemplateDefinition,
  data: DocumentData,
): string {
  if (!template.cover.enabled) return "";

  const shown = new Set(template.cover.showFields);
  const value = (key: string) => asText(getValue(data, key));
  const required = (key: string) =>
    template.document.fields.find((field) => field.key === key)?.required ?? false;

  const lineValue = (key: string, label: string): string => {
    const current = value(key);
    if (current) return `<p>${escapeHtml(current)}</p>`;
    if (required(key)) return `<p>${missingMarker(template, label)}</p>`;
    return "";
  };

  const title = value("title");
  const titleHtml = title
    ? escapeHtml(title)
    : missingMarker(template, "título") ||
      `<span class="missing">Título del informe</span>`;

  const logo = value("affiliation.logo") || template.cover.logo || "";
  const logoHtml = logo
    ? `<img class="cover-logo" src="${escapeAttribute(logo)}" alt="Logo institucional">`
    : "";

  const reportType =
    template.cover.showReportType && value("report_type")
      ? `<p class="cover-report-type">${escapeHtml(value("report_type"))}</p>`
      : "";

  const lines: string[] = [];

  if (shown.has("author.name")) {
    lines.push(lineValue("author.name", "autor"));
  }

  if (shown.has("author.id")) {
    const id = value("author.id");
    if (id) {
      lines.push(`<p>Código: ${escapeHtml(id)}</p>`);
    } else if (required("author.id")) {
      lines.push(`<p>Código: ${missingMarker(template, "código")}</p>`);
    }
  }

  if (shown.has("affiliation.university")) {
    lines.push(lineValue("affiliation.university", "universidad"));
  }

  if (shown.has("affiliation.faculty") && value("affiliation.faculty")) {
    lines.push(`<p>${escapeHtml(value("affiliation.faculty"))}</p>`);
  }

  if (shown.has("course")) {
    const courseName = value("course.name");
    const courseCode = value("course.code");
    if (courseName) {
      lines.push(
        `<p>${escapeHtml(courseName)}${
          courseCode ? ` (${escapeHtml(courseCode)})` : ""
        }</p>`,
      );
    } else if (required("course.name")) {
      lines.push(`<p>${missingMarker(template, "asignatura")}</p>`);
    }
  }

  if (shown.has("professor")) {
    const professorName = value("professor.name");
    const professorTitle = value("professor.title");
    if (professorName) {
      const prefix = professorTitle ? `${escapeHtml(professorTitle)} ` : "";
      lines.push(`<p>Docente: ${prefix}${escapeHtml(professorName)}</p>`);
    } else if (required("professor.name")) {
      lines.push(`<p>Docente: ${missingMarker(template, "docente")}</p>`);
    }
  }

  if (shown.has("sectionCycle")) {
    const section = value("section");
    const cycle = value("cycle");
    const parts: string[] = [];
    if (section) parts.push(`Sección ${escapeHtml(section)}`);
    if (cycle) parts.push(`Ciclo ${escapeHtml(cycle)}`);
    if (parts.length > 0) {
      lines.push(`<p>${parts.join(" — ")}</p>`);
    }
  }

  if (shown.has("cityDate")) {
    const city = value("city");
    const date = value("date");
    if (city || date) {
      lines.push(
        `<p>${[city, date].filter(Boolean).map(escapeHtml).join(", ")}</p>`,
      );
    } else if (required("date")) {
      lines.push(`<p>${missingMarker(template, "fecha")}</p>`);
    }
  }

  return `<header class="cover">
  <div class="cover-top">
    ${logoHtml}
    <h1 class="cover-title">${titleHtml}</h1>
    ${reportType}
    ${lines.length > 0 ? `<div class="cover-meta">${lines.join("\n    ")}</div>` : ""}
  </div>
</header>`;
}

function renderAbstract(
  template: TemplateDefinition,
  section: MarkdownSection,
  data: DocumentData,
): string {
  const rawKeywords = getValue(data, template.abstract.keywordsField);
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map(asText).filter(Boolean).join(", ")
    : asText(rawKeywords);

  const keywordsHtml = keywords
    ? `<p class="keywords"><em>${escapeHtml(
        template.abstract.keywordsLabel,
      )}:</em> ${escapeHtml(keywords)}</p>`
    : "";

  return `<section class="abstract-page">
  <h2 class="abstract-title">${escapeHtml(template.abstract.title)}</h2>
  ${section.bodyHtml}
  ${keywordsHtml}
</section>`;
}

function renderToc(
  template: TemplateDefinition,
  headings: HeadingEntry[],
): string {
  if (!template.toc.enabled) return "";

  const maxLevel = 2 + template.toc.depth - 1;
  const visible = headings.filter(
    (heading) => heading.level >= 2 && heading.level <= maxLevel,
  );
  if (visible.length === 0) return "";

  const items = visible
    .map(
      (heading) => `<li class="toc-level-${heading.level - 1}">
  <a href="#${escapeAttribute(heading.id)}">
    <span class="toc-text">${escapeHtml(heading.text)}</span>
    <span class="toc-leader"></span>
    <span class="toc-page-number"></span>
  </a>
</li>`,
    )
    .join("\n");

  return `<nav class="toc-page" aria-label="${escapeAttribute(template.toc.title)}">
  <h2 class="toc-title">${escapeHtml(template.toc.title)}</h2>
  <ol class="toc">
${items}
  </ol>
</nav>`;
}

function watermarkDataUri(template: TemplateDefinition): string | null {
  const { watermark } = template;
  if (!watermark.enabled || !watermark.text.trim()) return null;

  const { width, height } = pageDimensions(template);
  const viewHeight = Math.round((1000 * height) / width);
  const fontSize = watermark.size * (1000 / width) * 0.3528;
  const centerX = 500;
  const centerY = Math.round(viewHeight / 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${viewHeight}" width="100%" height="100%">
  <text x="${centerX}" y="${centerY}" fill="${watermark.color}" fill-opacity="${watermark.opacity}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize.toFixed(2)}" font-weight="700" text-anchor="middle" transform="rotate(${watermark.angle} ${centerX} ${centerY})">${escapeHtml(
    watermark.text,
  )}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isReferencesSection(
  template: TemplateDefinition,
  section: MarkdownSection,
): boolean {
  const titles = new Set(template.references.titles.map(normalizeTitle));
  return titles.has(normalizeTitle(section.title));
}

function isAppendixSection(section: MarkdownSection): boolean {
  return /^(anexo|apéndice|apendice|appendix)\b/i.test(section.title.trim());
}

function pageScript(pageNumberFormat: string, pageNumberEnabled: boolean): string {
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
              .replace(/\\{\\{page\\}\\}/g, String(index + 1))
              .replace(/\\{\\{pages\\}\\}/g, String(total))
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

export function buildDocument(input: BuildDocumentInput): BuiltDocument {
  const { template } = input;
  const analysis = analyzeDocument(input.markdown, template, input.overrides);
  const parsed = parseMarkdown(analysis.body, {
    figureCaptionPosition: template.figures.captionPosition,
  });

  const abstractSlug = template.abstract.enabled
    ? slugify(template.abstract.title)
    : null;
  const abstractSection =
    parsed.sections.find((section) => section.slug === abstractSlug) ?? null;

  const bodySections = parsed.sections.filter(
    (section) => section !== abstractSection,
  );

  const toc = renderToc(
    template,
    parsed.headings.filter((heading) => heading.id !== abstractSlug),
  );

  const repeatedTitle =
    template.body.repeatTitleOnFirstPage && analysis.title
      ? `<h1 class="body-title">${escapeHtml(analysis.title)}</h1>`
      : "";

  const preamble = parsed.preambleHtml.trim()
    ? `<section class="doc-section" data-section="preambulo">${parsed.preambleHtml}</section>`
    : "";

  const bodyHtml = bodySections
    .map((section) => {
      const classes = ["doc-section"];
      if (isReferencesSection(template, section)) classes.push("references-section");
      if (isAppendixSection(section)) classes.push("appendix-section");

      return `<section class="${classes.join(" ")}" data-section="${escapeAttribute(
        section.slug,
      )}">${section.html}</section>`;
    })
    .join("\n");

  const coverHtml = renderCover(template, analysis.data);
  const abstractHtml = abstractSection
    ? renderAbstract(template, abstractSection, analysis.data)
    : "";

  const tableClasses = [
    "doc",
    `tables-${template.tables.style}`,
    template.tables.zebra ? "tables-zebra" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const documentHtml = `<div class="${tableClasses}">
${coverHtml}
${abstractHtml}
${toc}
${repeatedTitle}
${preamble}
${bodyHtml}
</div>`;

  const css = buildDocumentCss(template, {
    resolve: (key) => {
      const text = asText(getValue(analysis.data, key));
      return text || null;
    },
    watermarkDataUri: watermarkDataUri(template),
  });

  const dimensions = pageDimensions(template);

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
${pageScript(template.chrome.pageNumber.format, template.chrome.pageNumber.enabled)}
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
    dimensions,
  };
}
