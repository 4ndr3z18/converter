import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TemplateMeta } from "@/lib/template/model";

const RENDER_DIR = path.join(process.cwd(), ".data", "render");
const TOKEN_RE = /^[a-f0-9]{32}$/;
const TTL_MS = 2 * 60 * 60 * 1000;

export type TemplateSnapshot = {
  meta: TemplateMeta;
  html: string;
  css: string;
};

export type RenderJob = {
  token: string;
  markdown: string;
  template: string;
  templateSnapshot?: TemplateSnapshot;
  overrides?: Record<string, unknown>;
  filename: string;
  createdAt: number;
};

export type CreateRenderJobInput = {
  markdown: string;
  template: string;
  templateSnapshot?: TemplateSnapshot;
  overrides?: Record<string, unknown>;
  filename: string;
};

export async function createRenderJob(
  input: CreateRenderJobInput,
): Promise<RenderJob> {
  await mkdir(RENDER_DIR, { recursive: true });

  const token = randomBytes(16).toString("hex");
  const job: RenderJob = {
    ...input,
    token,
    createdAt: Date.now(),
  };

  await writeFile(
    path.join(RENDER_DIR, `${token}.json`),
    JSON.stringify(job),
    "utf8",
  );

  void cleanup();

  return job;
}

export async function readRenderJob(token: string): Promise<RenderJob | null> {
  if (!TOKEN_RE.test(token)) return null;

  try {
    const raw = await readFile(path.join(RENDER_DIR, `${token}.json`), "utf8");
    const job = JSON.parse(raw) as RenderJob;
    if (typeof job.markdown !== "string" || typeof job.template !== "string") {
      return null;
    }
    if (
      job.templateSnapshot &&
      (typeof job.templateSnapshot.html !== "string" ||
        typeof job.templateSnapshot.css !== "string" ||
        typeof job.templateSnapshot.meta !== "object")
    ) {
      return null;
    }
    if (Date.now() - job.createdAt > TTL_MS) return null;
    return job;
  } catch {
    return null;
  }
}

async function cleanup(): Promise<void> {
  try {
    const entries = await readdir(RENDER_DIR);
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          const fullPath = path.join(RENDER_DIR, entry);
          try {
            const info = await stat(fullPath);
            if (now - info.mtimeMs > TTL_MS) await unlink(fullPath);
          } catch {
            // el archivo pudo desaparecer mientras limpiábamos
          }
        }),
    );
  } catch {
    // la limpieza es best-effort
  }
}
