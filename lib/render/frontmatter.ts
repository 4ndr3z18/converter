import { load as loadYaml } from "js-yaml";
import { asText, sanitizeFilename } from "@/lib/utils/text";

export type DocumentData = Record<string, unknown>;

export type RenderIssue = {
  code: "yaml" | "missing" | "invalid";
  severity: "error" | "warning";
  field?: string;
  label?: string;
  message: string;
};

export type FrontMatterResult = {
  data: DocumentData;
  body: string;
  issues: RenderIssue[];
};

const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function parseFrontMatter(markdown: string): FrontMatterResult {
  const source = markdown.replace(/^\uFEFF/, "");
  const match = FRONT_MATTER_RE.exec(source);

  if (!match) {
    return { data: {}, body: source, issues: [] };
  }

  const raw = match[1];
  const body = source.slice(match[0].length).replace(/^\r?\n/, "");
  const issues: RenderIssue[] = [];

  let parsed: unknown;
  try {
    parsed = loadYaml(raw);
  } catch (error) {
    issues.push({
      code: "yaml",
      severity: "error",
      message:
        error instanceof Error
          ? `No se pudo leer el front matter: ${error.message}`
          : "No se pudo leer el front matter.",
    });
    return { data: {}, body, issues };
  }

  if (parsed === null || parsed === undefined) {
    return { data: {}, body, issues };
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({
      code: "yaml",
      severity: "error",
      message: "El front matter debe ser un mapa de claves y valores.",
    });
    return { data: {}, body, issues };
  }

  return { data: parsed as DocumentData, body, issues };
}

export function getValue(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((accumulator, key) => {
    if (accumulator && typeof accumulator === "object" && !Array.isArray(accumulator)) {
      return (accumulator as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

export function setValue(target: DocumentData, path: string, value: unknown): void {
  const keys = path.split(".");
  let cursor: Record<string, unknown> = target;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }

    const next = cursor[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });
}

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isSafePath(path: string): boolean {
  return path.split(".").every((key) => !UNSAFE_KEYS.has(key));
}

export function applyOverrides(
  data: DocumentData,
  overrides?: Record<string, unknown>,
): DocumentData {
  if (!overrides) return data;

  const result: DocumentData = structuredClone(data);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || !isSafePath(key)) continue;
    if (key.includes(".")) {
      setValue(result, key, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export type TemplateField = {
  key: string;
  label: string;
  required: boolean;
};

export function validateTemplateFields(
  fields: TemplateField[],
  data: DocumentData,
): RenderIssue[] {
  return fields
    .filter((field) => field.required)
    .filter((field) => asText(getValue(data, field.key)) === "")
    .map((field) => ({
      code: "missing" as const,
      severity: "error" as const,
      field: field.key,
      label: field.label,
      message: `Falta el campo obligatorio «${field.label}» (${field.key}).`,
    }));
}

export function resolvePattern(
  pattern: string,
  resolve: (key: string) => string,
): string {
  return pattern.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) =>
    resolve(key),
  );
}

export function buildFilenameFromPattern(
  pattern: string,
  data: DocumentData,
): string {
  const raw = resolvePattern(pattern, (key) => asText(getValue(data, key)))
    .replace(/\s*[-–—]\s*(?=$|\s*[-–—])/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return `${sanitizeFilename(raw, "documento")}.pdf`;
}
