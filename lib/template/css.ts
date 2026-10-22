import type { TemplateDefinition } from "@/lib/template/schema";
import { pageDimensions } from "@/lib/template/schema";
import { cssContentFromFormat } from "@/lib/utils/text";

export type CssContext = {
  /** Resuelve una variable del front matter ({{title}}, {{course}}...). */
  resolve: (key: string) => string | null;
  /** SVG inline ya codificado para la marca de agua. */
  watermarkDataUri?: string | null;
};

const mm = (value: number) => `${value}mm`;
const pt = (value: number) => `${value}pt`;

function headingRule(template: TemplateDefinition, markdownLevel: number): string {
  const level = template.headings.levels.find(
    (candidate) => candidate.markdownLevel === markdownLevel,
  );
  if (!level) return "";

  const selectors = [`.doc h${markdownLevel}`];
  const declarations = [
    `font-size: ${pt(level.size)}`,
    `font-weight: ${level.weight}`,
    `font-style: ${level.italic ? "italic" : "normal"}`,
    `text-align: ${level.align}`,
    `line-height: ${template.typography.body.lineHeight}`,
    `margin: ${pt(level.spaceBefore)} 0 ${pt(level.spaceAfter)} 0`,
    `text-indent: ${level.indent > 0 && !level.runIn ? mm(level.indent) : "0"}`,
    `color: ${level.color ?? template.colors.text}`,
    level.keepWithNext ? "break-after: avoid; page-break-after: avoid" : "",
    level.borderBottom
      ? `border-bottom: 0.5pt solid ${template.colors.rule}; padding-bottom: 2pt`
      : "",
    template.headings.case === "title" ? "text-transform: capitalize" : "",
  ].filter(Boolean);

  let css = `${selectors.join(", ")} { ${declarations.join("; ")}; }`;

  if (level.runIn) {
    css += `
.doc h${markdownLevel} { display: inline; }
.doc h${markdownLevel}::after { content: ". "; }
.doc h${markdownLevel} + p { display: inline; text-indent: 0; }`;
  }

  return css;
}

function marginBoxes(template: TemplateDefinition, context: CssContext): string {
  const { chrome } = template;
  const slots: Record<string, { content: string; fontSize: number } | null> = {
    "top-left": null,
    "top-center": null,
    "top-right": null,
    "bottom-left": null,
    "bottom-center": null,
    "bottom-right": null,
  };

  const resolveContent = (format: string) =>
    cssContentFromFormat(format, context.resolve);

  if (chrome.header.enabled) {
    const map = {
      "top-left": chrome.header.left,
      "top-center": chrome.header.center,
      "top-right": chrome.header.right,
    };
    for (const [slot, format] of Object.entries(map)) {
      if (!format.trim()) continue;
      const content = resolveContent(format);
      if (content) slots[slot] = { content, fontSize: chrome.header.fontSize };
    }
  }

  if (chrome.footer.enabled) {
    const map = {
      "bottom-left": chrome.footer.left,
      "bottom-center": chrome.footer.center,
      "bottom-right": chrome.footer.right,
    };
    for (const [slot, format] of Object.entries(map)) {
      if (!format.trim()) continue;
      const content = resolveContent(format);
      if (content) slots[slot] = { content, fontSize: chrome.footer.fontSize };
    }
  }

  const rules = Object.entries(slots)
    .filter(([, value]) => value !== null)
    .map(([slot, value]) => {
      const isTop = slot.startsWith("top-");
      return `  @${slot} {
    content: ${value!.content};
    font-family: ${template.typography.body.fontFamily};
    font-size: ${pt(value!.fontSize)};
    color: ${template.colors.text};
    text-align: ${slot.endsWith("center") ? "center" : "right"};
    align-items: flex-start;
    ${isTop ? "padding-top: 10mm;" : "padding-bottom: 8mm;"}
  }`;
    });

  const firstPageRules =
    chrome.header.skipFirstPage || chrome.footer.skipFirstPage
      ? Object.keys(slots)
          .filter((slot) => slots[slot] !== null)
          .map((slot) => `  @page :first { @${slot} { content: none; } }`)
          .join("\n")
      : "";

  return `@page {
  size: ${mm(pageDimensions(template).width)} ${mm(pageDimensions(template).height)};
  margin: ${mm(template.page.margin.top)} ${mm(template.page.margin.right)} ${mm(
    template.page.margin.bottom,
  )} ${mm(template.page.margin.left)};
${rules.join("\n")}
}
${firstPageRules}`;
}

function pageNumberRule(template: TemplateDefinition): string {
  const { pageNumber } = template.chrome;
  if (!pageNumber.enabled) return "";

  const offset = 12.7; // 0.5in desde el borde superior o inferior
  const margin = template.page.margin;
  let placement = "";

  if (pageNumber.position === "top-center") {
    placement = `top: ${mm(offset)};
  left: 50%;
  transform: translateX(-50%);
  text-align: center;`;
  } else if (pageNumber.position === "bottom-center") {
    placement = `bottom: ${mm(offset)};
  left: 50%;
  transform: translateX(-50%);
  text-align: center;`;
  } else if (pageNumber.position === "bottom-right") {
    placement = `bottom: ${mm(offset)};
  right: ${mm(margin.right)};
  text-align: right;`;
  } else {
    placement = `top: ${mm(offset)};
  right: ${mm(margin.right)};
  text-align: right;`;
  }

  return `.pagedjs_page {
  position: relative;
}

.pagedjs_page::after {
  content: attr(data-page-label);
  position: absolute;
  ${placement}
  font-family: ${template.typography.body.fontFamily};
  font-size: ${pt(template.typography.body.fontSize)};
  line-height: 1;
  color: ${template.colors.text};
  white-space: nowrap;
  pointer-events: none;
}
${pageNumber.skipFirstPage ? ".pagedjs_page:first-child::after { content: none; }" : ""}`;
}

function watermarkRule(template: TemplateDefinition, context: CssContext): string {
  if (!template.watermark.enabled || !context.watermarkDataUri) return "";
  return `.pagedjs_page {
  background-image: url("${context.watermarkDataUri}");
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 100% 100%;
}`;
}

export function buildDocumentCss(
  template: TemplateDefinition,
  context: CssContext,
): string {
  const { typography, colors } = template;
  const tableFont =
    template.typography.table.fontFamily === "inherit"
      ? template.typography.body.fontFamily
      : template.typography.table.fontFamily;

  const headings = template.headings.levels
    .map((level) => headingRule(template, level.markdownLevel))
    .join("\n");

  const referencesListRule = template.references.stripBullets
    ? `.doc .references-section ul,
.doc .references-section ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
.doc .references-section li {
  padding-left: ${mm(template.typography.body.firstLineIndent)};
  text-indent: -${mm(template.typography.body.firstLineIndent)};
  margin: 0;
}
.doc .references-section p {
  margin: 0 0 0 ${mm(template.typography.body.firstLineIndent)};
  text-indent: -${mm(template.typography.body.firstLineIndent)};
}
.doc .references-section li > p {
  text-indent: inherit;
  margin: 0;
}`
    : "";

  return `
/* ---------- Página ---------- */
${marginBoxes(template, context)}
${pageNumberRule(template)}

/* ---------- Base ---------- */
html,
body {
  margin: 0;
  padding: 0;
  background: #e6e9ee;
}

.doc {
  font-family: ${typography.body.fontFamily};
  font-size: ${pt(typography.body.fontSize)};
  line-height: ${typography.body.lineHeight};
  color: ${colors.text};
  text-align: ${typography.body.align};
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.doc p {
  margin: ${pt(typography.body.spaceBefore)} 0 ${pt(typography.body.spaceAfter)} 0;
  text-indent: ${mm(typography.body.firstLineIndent)};
  orphans: 2;
  widows: 2;
}

.doc p:empty {
  display: none;
}

.doc a {
  color: inherit;
  text-decoration: underline;
}

.doc hr {
  border: 0;
  border-top: 0.5pt solid ${colors.rule};
  margin: 8pt 0;
}

.doc img {
  max-width: 100%;
  height: auto;
}

.doc .missing {
  color: ${colors.muted};
}

/* ---------- Encabezados ---------- */
${headings}

/* ---------- Portada ---------- */
.cover {
  break-after: page;
  page-break-after: always;
}

.cover-top {
  padding-top: 4mm;
  text-align: center;
}

.cover-logo {
  display: block;
  margin: 0 auto ${mm(template.cover.titleOffsetTop)} auto;
  max-width: 90mm;
  max-height: ${mm(template.cover.logoHeight)};
  width: auto;
  height: auto;
}

.cover-title {
  font-size: ${pt(typography.body.fontSize)};
  font-weight: 700;
  line-height: ${typography.body.lineHeight};
  text-align: center;
  text-indent: 0;
  margin: 0 0 ${mm(8.5)} 0;
  padding: 0;
}

.cover-report-type {
  font-style: italic;
  text-align: center;
  text-indent: 0;
  margin: 0 0 ${mm(8.5)} 0;
}

.cover-meta p {
  text-align: center;
  text-indent: 0;
  margin: 0;
}

/* ---------- Resumen ---------- */
.abstract-page {
  break-before: page;
  page-break-before: always;
  break-after: page;
  page-break-after: always;
}

.abstract-title {
  font-size: ${pt(typography.body.fontSize)};
  font-weight: 700;
  text-align: center;
  text-indent: 0;
  margin: 0;
  line-height: ${typography.body.lineHeight};
}

.abstract-page p {
  text-indent: 0;
}

.abstract-page .keywords {
  margin-top: 0;
  text-indent: 0;
}

.keywords em {
  font-style: italic;
}

/* ---------- Índice ---------- */
.toc-page {
  break-before: page;
  page-break-before: always;
}

.toc-title {
  font-size: ${pt(typography.body.fontSize)};
  font-weight: 700;
  text-align: center;
  text-indent: 0;
  margin: 0 0 ${mm(8.5)} 0;
}

.toc {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc li {
  margin: 0;
  text-indent: 0;
}

.toc a {
  display: flex;
  align-items: baseline;
  color: inherit;
  text-decoration: none;
}

.toc-text {
  flex: 0 1 auto;
}

.toc-leader {
  flex: 1 1 auto;
  border-bottom: 1px dotted currentColor;
  margin: 0 4pt;
  transform: translateY(-3pt);
}

.toc-page-number {
  flex: 0 0 auto;
  min-width: 2em;
  text-align: right;
}

.toc-level-2 {
  padding-left: 6.35mm;
}
${template.toc.dotLeaders ? "" : ".toc-leader { border-bottom: none; }"}

/* ---------- Título repetido ---------- */
.body-title {
  font-size: ${pt(typography.body.fontSize)};
  font-weight: 700;
  text-align: center;
  text-indent: 0;
  margin: 0;
  line-height: ${typography.body.lineHeight};
}

/* ---------- Listas ---------- */
.doc ul,
.doc ol {
  margin: 0 0 0 6.35mm;
  padding-left: 6.35mm;
}

.doc li {
  margin: 0;
}

.doc li > p {
  text-indent: 0;
}

/* ---------- Citas ---------- */
.doc blockquote {
  margin: 0 0 0 ${mm(template.blockquote.indent)};
  padding: 0;
  border: 0;
  font-style: ${template.blockquote.italic ? "italic" : "normal"};
}

.doc blockquote p {
  text-indent: 0;
}

/* ---------- Tablas ---------- */
.doc .table-caption {
  text-indent: 0;
  margin: ${mm(2)} 0 0 0;
  break-after: avoid;
  page-break-after: avoid;
}

.doc .float-label {
  display: block;
  font-weight: 700;
  font-size: ${pt(template.typography.caption.fontSize)};
  line-height: ${template.typography.caption.lineHeight};
}

.doc .float-title {
  display: block;
  font-style: italic;
  font-size: ${pt(template.typography.caption.fontSize)};
  line-height: ${template.typography.caption.lineHeight};
}

.doc table {
  width: 100%;
  border-collapse: collapse;
  font-family: ${tableFont};
  font-size: ${pt(template.tables.fontSize ?? template.typography.table.fontSize)};
  line-height: ${template.typography.table.lineHeight};
  margin: ${mm(2)} 0 0 0;
  break-inside: auto;
}

.doc thead {
  display: table-header-group;
}

.doc th,
.doc td {
  text-align: left;
  vertical-align: top;
  padding: 3pt 6pt;
}

.doc tr {
  break-inside: avoid;
}

.doc.tables-apa table {
  border-top: 1pt solid ${colors.rule};
  border-bottom: 1pt solid ${colors.rule};
}

.doc.tables-apa thead th {
  border-bottom: 1pt solid ${colors.rule};
  font-weight: 700;
}

.doc.tables-grid table {
  border: 0.5pt solid #c9ced6;
}

.doc.tables-grid th,
.doc.tables-grid td {
  border: 0.5pt solid #c9ced6;
}

.doc.tables-grid thead th {
  background: #f2f4f7;
  font-weight: 700;
}

.doc.tables-zebra tbody tr:nth-child(even) td {
  background: #f7f8fa;
}

/* ---------- Figuras ---------- */
.doc .figure {
  margin: ${mm(2)} 0 0 0;
  break-inside: avoid;
}

.doc .figure img {
  display: block;
  max-width: 100%;
  margin: 4pt auto 0 auto;
}

.doc .float-caption {
  text-align: left;
}

/* ---------- Código ---------- */
.doc pre {
  font-family: ${typography.code.fontFamily};
  font-size: ${pt(typography.code.fontSize)};
  line-height: ${typography.code.lineHeight};
  background: ${typography.code.background};
  border: 0.5pt solid ${typography.code.borderColor};
  padding: 6pt 8pt;
  margin: 6pt 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  break-inside: avoid;
}

.doc pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
}

.doc :not(pre) > code {
  font-family: ${typography.code.fontFamily};
  font-size: 0.95em;
  background: ${typography.code.background};
  padding: 0 2pt;
}

.doc .katex-display {
  margin: 6pt 0;
  break-inside: avoid;
}

/* ---------- Referencias ---------- */
${referencesListRule}

.doc .references-section {
  ${template.references.newPage ? "break-before: page; page-break-before: always;" : ""}
}

.doc .appendix-section {
  break-before: page;
  page-break-before: always;
}

/* ---------- Marca de agua ---------- */
${watermarkRule(template, context)}

/* ---------- Impresión ---------- */
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
}
