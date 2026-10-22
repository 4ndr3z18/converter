import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  templateBundleSchema,
  templateMetaSchema,
  type TemplateBundle,
  type TemplateMeta,
  type TemplateRecord,
  type TemplateSummary,
} from "@/lib/template/model";

const BUILTIN_DIR = path.join(process.cwd(), "templates");
const USER_DIR = path.join(process.cwd(), ".data", "templates");
const TEMPLATE_ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
export const DEFAULT_TEMPLATE_ID = "apa7";

export class TemplateStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateStoreError";
  }
}

export class TemplateNotFoundError extends TemplateStoreError {
  constructor(id: string) {
    super(`La plantilla «${id}» no existe.`);
    this.name = "TemplateNotFoundError";
  }
}

export class TemplateReadOnlyError extends TemplateStoreError {
  constructor(id: string) {
    super(`La plantilla integrada «${id}» es de solo lectura.`);
    this.name = "TemplateReadOnlyError";
  }
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function isTemplateId(value: string): boolean {
  return TEMPLATE_ID_RE.test(value);
}

function baseTemplateId(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "plantilla";
}

async function directoryIds(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && isTemplateId(entry.name))
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function readTemplateFromDir(
  dir: string,
  id: string,
  builtin: boolean,
): Promise<TemplateRecord> {
  const folder = path.join(dir, id);

  let metaRaw: string;
  let html: string;
  let css: string;
  let updatedAt: number;

  try {
    const [metaFile, htmlFile, cssFile, info] = await Promise.all([
      readFile(path.join(folder, "template.json"), "utf8"),
      readFile(path.join(folder, "template.html"), "utf8"),
      readFile(path.join(folder, "template.css"), "utf8"),
      stat(folder),
    ]);

    metaRaw = metaFile;
    html = htmlFile;
    css = cssFile;
    updatedAt = info.mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new TemplateStoreError(
        `La plantilla «${id}» está incompleta: faltan template.json, template.html o template.css.`,
      );
    }
    throw error;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(metaRaw.replace(/^\uFEFF/, ""));
  } catch {
    throw new TemplateStoreError(
      `El archivo template.json de «${id}» no es JSON válido.`,
    );
  }

  const parsed = templateMetaSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "template.json"}: ${issue.message}`)
      .join(" ");
    throw new TemplateStoreError(
      `Los metadatos de la plantilla «${id}» no son válidos. ${details}`,
    );
  }

  return {
    id,
    builtin,
    meta: parsed.data,
    html: normalizeLineEndings(html),
    css: normalizeLineEndings(css),
    updatedAt,
  };
}

async function safeReadTemplate(
  dir: string,
  id: string,
  builtin: boolean,
): Promise<TemplateRecord | null> {
  if (!isTemplateId(id)) return null;

  try {
    await stat(path.join(dir, id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  return readTemplateFromDir(dir, id, builtin);
}

async function safeListTemplate(
  dir: string,
  id: string,
  builtin: boolean,
): Promise<TemplateRecord | null> {
  try {
    return await safeReadTemplate(dir, id, builtin);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[templates] Se omitió «${id}»: ${detail}`);
    return null;
  }
}

async function allTemplates(): Promise<TemplateRecord[]> {
  const [builtinIds, userIds] = await Promise.all([
    directoryIds(BUILTIN_DIR),
    directoryIds(USER_DIR),
  ]);

  const builtins = (
    await Promise.all(
      builtinIds.map((id) => safeListTemplate(BUILTIN_DIR, id, true)),
    )
  ).filter((template): template is TemplateRecord => Boolean(template));

  const builtinSet = new Set(builtins.map((template) => template.id));
  const users = (
    await Promise.all(
      userIds
        .filter((id) => !builtinSet.has(id))
        .map((id) => safeListTemplate(USER_DIR, id, false)),
    )
  ).filter((template): template is TemplateRecord => Boolean(template));

  return [...builtins, ...users].sort((left, right) => {
    if (left.builtin !== right.builtin) return left.builtin ? -1 : 1;
    return left.meta.name.localeCompare(right.meta.name, "es");
  });
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  return allTemplates();
}

export async function listTemplateSummaries(): Promise<TemplateSummary[]> {
  const templates = await allTemplates();
  return templates.map((template) => ({
    id: template.id,
    name: template.meta.name,
    description: template.meta.description,
    builtin: template.builtin,
    updatedAt: template.updatedAt,
  }));
}

export async function getTemplate(id: string): Promise<TemplateRecord | null> {
  if (!isTemplateId(id)) return null;

  const builtin = await safeReadTemplate(BUILTIN_DIR, id, true);
  if (builtin) return builtin;

  return safeReadTemplate(USER_DIR, id, false);
}

export async function requireTemplate(id: string): Promise<TemplateRecord> {
  const template = await getTemplate(id);
  if (!template) throw new TemplateNotFoundError(id);
  return template;
}

async function templateFolderExists(dir: string, id: string): Promise<boolean> {
  try {
    const info = await stat(path.join(dir, id));
    return info.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function nextAvailableId(name: string, requested?: string): Promise<string> {
  const base =
    requested && isTemplateId(requested) ? requested : baseTemplateId(name);

  for (let index = 1; index < 500; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const existing =
      (await templateFolderExists(BUILTIN_DIR, candidate)) ||
      (await templateFolderExists(USER_DIR, candidate));
    if (!existing) return candidate;
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function writeTemplateFolder(
  id: string,
  meta: TemplateMeta,
  html: string,
  css: string,
): Promise<TemplateRecord> {
  const folder = path.join(USER_DIR, id);
  await mkdir(folder, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(folder, "template.json"),
      `${JSON.stringify(meta, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(folder, "template.html"), html, "utf8"),
    writeFile(path.join(folder, "template.css"), css, "utf8"),
  ]);

  return readTemplateFromDir(USER_DIR, id, false);
}

export type CreateTemplateInput = {
  meta: TemplateMeta;
  html: string;
  css: string;
  id?: string;
};

export async function createTemplate(
  input: CreateTemplateInput,
): Promise<TemplateRecord> {
  const meta = templateMetaSchema.parse(input.meta);
  const id = await nextAvailableId(meta.name, input.id);
  return writeTemplateFolder(id, meta, input.html, input.css);
}

export type UpdateTemplateInput = {
  meta: TemplateMeta;
  html: string;
  css: string;
};

export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
): Promise<TemplateRecord> {
  const current = await requireTemplate(id);
  if (current.builtin) throw new TemplateReadOnlyError(id);

  const meta = templateMetaSchema.parse(input.meta);
  return writeTemplateFolder(id, meta, input.html, input.css);
}

export async function deleteTemplate(id: string): Promise<void> {
  const current = await requireTemplate(id);
  if (current.builtin) throw new TemplateReadOnlyError(id);
  await rm(path.join(USER_DIR, id), { recursive: true, force: true });
}

export async function duplicateTemplate(id: string): Promise<TemplateRecord> {
  const source = await requireTemplate(id);
  const suffix = " (copia)";
  const name = `${source.meta.name.slice(0, 120 - suffix.length)}${suffix}`;
  return createTemplate({
    meta: {
      ...source.meta,
      name,
    },
    html: source.html,
    css: source.css,
  });
}

export async function exportTemplate(id: string): Promise<TemplateBundle & { id: string }> {
  const template = await requireTemplate(id);
  return {
    id: template.id,
    meta: template.meta,
    html: template.html,
    css: template.css,
  };
}

export async function importTemplate(input: unknown): Promise<TemplateRecord> {
  const parsed = templateBundleSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "plantilla"}: ${issue.message}`)
      .join(" ");
    throw new TemplateStoreError(`La plantilla importada no es válida. ${details}`);
  }

  return createTemplate({
    meta: parsed.data.meta,
    html: parsed.data.html,
    css: parsed.data.css,
    id: parsed.data.id,
  });
}

export async function getDefaultTemplateId(): Promise<string | null> {
  const preferred = await getTemplate(DEFAULT_TEMPLATE_ID);
  if (preferred) return preferred.id;

  const templates = await listTemplates();
  return templates[0]?.id ?? null;
}
