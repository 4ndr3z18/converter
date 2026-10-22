import MarkdownIt, {
  type MarkdownIt as MarkdownItType,
  type StateCore,
  type Token,
} from "markdown-it";
import anchor from "markdown-it-anchor";
import katexPlugin from "@vscode/markdown-it-katex";
import hljs from "highlight.js";
import { escapeAttribute, escapeHtml, slugify } from "@/lib/utils/text";

export type HeadingEntry = {
  level: number;
  text: string;
  id: string;
};

export type MarkdownSection = {
  title: string;
  slug: string;
  level: number;
  html: string;
  bodyHtml: string;
  headings: HeadingEntry[];
};

export type ParsedMarkdown = {
  sections: MarkdownSection[];
  preambleHtml: string;
  headings: HeadingEntry[];
};

export type MarkdownOptions = {
  figureCaptionPosition?: "above" | "below";
};

type Caption = {
  label: string;
  title: string;
};

function plainText(token: Token | undefined): string {
  if (!token) return "";
  if (token.type === "text" || token.type === "code_inline") return token.content;

  return (token.children ?? [])
    .filter((child) => child.type !== "image")
    .map((child) => plainText(child))
    .join("");
}

function parseCaption(raw: string, kind: "Tabla" | "Figura"): Caption | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const match = new RegExp(
    `^(${kind === "Tabla" ? "tabla|table" : "figura|figure"})\\s+(\\d+)\\.?\\s*(.*)$`,
    "i",
  ).exec(text);

  if (match) {
    return {
      label: `${kind} ${match[2]}.`,
      title: match[3].trim(),
    };
  }

  return { label: "", title: text };
}

function renderCaption(caption: Caption | null): string {
  if (!caption) return "";
  const label = caption.label
    ? `<span class="float-label">${escapeHtml(caption.label)}</span>`
    : "";
  const title = caption.title
    ? `<span class="float-title">${escapeHtml(caption.title)}</span>`
    : "";
  return `<figcaption class="float-caption">${label}${title}</figcaption>`;
}

function imageOnly(children: Token[] | null | undefined): Token | null {
  if (!children) return null;

  const relevant = children.filter(
    (child) => !(child.type === "text" && child.content.trim() === ""),
  );

  if (relevant.length !== 1) return null;
  return relevant[0].type === "image" ? relevant[0] : null;
}

type MarkdownItInstance = MarkdownItType;

function tokenAttr(token: Token, name: string): string {
  const value = token.attrGet(name);
  return value === null || value === undefined ? "" : String(value);
}

function apaBlocksPlugin(md: MarkdownItInstance, options: MarkdownOptions): void {
  md.core.ruler.after("inline", "apa_blocks", (state: StateCore) => {
    const tokens = state.tokens;
    const captionPosition = options.figureCaptionPosition ?? "above";

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type !== "paragraph_open") continue;

      const inline = tokens[index + 1];
      const close = tokens[index + 2];
      if (!inline || inline.type !== "inline" || !close || close.type !== "paragraph_close") {
        continue;
      }

      const image = imageOnly(inline.children);
      if (image) {
        const src = tokenAttr(image, "src");
        if (!src) continue;

        const alt = tokenAttr(image, "alt") || image.content || "";
        const caption = renderCaption(parseCaption(alt, "Figura"));
        const imageTitle = tokenAttr(image, "title");
        const titleAttr = imageTitle
          ? ` title="${escapeAttribute(imageTitle)}"`
          : "";
        const img = `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${titleAttr}>`;
        const body =
          captionPosition === "above"
            ? `${caption}${img}`
            : `${img}${caption}`;

        const figure = new state.Token("html_block", "", 0);
        figure.content = `<figure class="figure">${body}</figure>`;
        figure.map = token.map;

        tokens.splice(index, 3, figure);
        index += 0;
        continue;
      }

      // Título de tabla: "Tabla 1. Frecuencia de uso" justo antes de una tabla.
      const next = tokens[index + 3];
      if (next?.type !== "table_open") continue;

      const caption = parseCaption(inline.content, "Tabla");
      if (!caption || !caption.label) continue;

      const block = new state.Token("html_block", "", 0);
      block.content = `<div class="table-caption"><span class="float-label">${escapeHtml(
        caption.label,
      )}</span><span class="float-title">${escapeHtml(caption.title)}</span></div>`;
      block.map = token.map;

      tokens.splice(index, 3, block);
    }
  });
}

export function createMarkdown(
  options: MarkdownOptions = {},
): MarkdownItInstance {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight(code, language) {
      if (language && hljs.getLanguage(language)) {
        try {
          const highlighted = hljs.highlight(code, {
            language,
            ignoreIllegals: true,
          }).value;
          return `<pre class="hljs"><code class="language-${escapeAttribute(
            language,
          )}">${highlighted}</code></pre>`;
        } catch {
          // cae al bloque sin resaltado
        }
      }

      return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
    },
  });

  md.use(anchor, {
    slugify,
    uniqueSlugStartIndex: 2,
  });

  md.use(katexPlugin, {
    throwOnError: false,
    enableFencedBlocks: true,
  });

  md.use(apaBlocksPlugin, options);

  return md;
}

export function parseMarkdown(
  body: string,
  options: MarkdownOptions = {},
): ParsedMarkdown {
  const md = createMarkdown(options);
  const source = body.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n");
  const env: Record<string, unknown> = {};
  const tokens = md.parse(source, env);

  const render = (subset: Token[]) => md.renderer.render(subset, md.options, env);

  const headings: HeadingEntry[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open") continue;

    const text = plainText(tokens[index + 1]).trim();
    const rawId = tokenAttr(token, "id");
    const id = rawId || slugify(text);
    headings.push({
      level: Number(token.tag.slice(1)),
      text,
      id,
    });
  }

  const starts: number[] = [];
  tokens.forEach((token: Token, index: number) => {
    if (token.type === "heading_open" && token.tag === "h2") starts.push(index);
  });

  if (starts.length === 0) {
    return {
      sections: [],
      preambleHtml: render(tokens),
      headings,
    };
  }

  const sections: MarkdownSection[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index];
    const to = starts[index + 1] ?? tokens.length;
    const subset = tokens.slice(from, to);
    const headingOpen = subset[0];
    const headingText = plainText(subset[1]).trim();
    const rawSlug = tokenAttr(headingOpen, "id");
    const slug = rawSlug || slugify(headingText);
    const sectionHeadings: HeadingEntry[] = [];

    for (let cursor = 0; cursor < subset.length; cursor += 1) {
      const token = subset[cursor];
      if (token.type !== "heading_open") continue;
      const text = plainText(subset[cursor + 1]).trim();
      sectionHeadings.push({
        level: Number(token.tag.slice(1)),
        text,
        id: tokenAttr(token, "id") || slugify(text),
      });
    }

    sections.push({
      title: headingText,
      slug,
      level: 2,
      html: render(subset),
      bodyHtml: render(subset.slice(3)),
      headings: sectionHeadings,
    });
  }

  return {
    sections,
    preambleHtml: render(tokens.slice(0, starts[0])),
    headings,
  };
}
