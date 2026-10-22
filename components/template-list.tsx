"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  STARTER_CSS,
  STARTER_HTML,
  STARTER_META,
} from "@/lib/template/starter";

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  updatedAt: number;
};

export function TemplateList() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/templates", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las plantillas.");
      }
      setTemplates((data.templates ?? []) as TemplateSummary[]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar las plantillas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const input = folderRef.current;
    if (!input) return;
    // Atributos no estándar para abrir un selector de carpeta en Chromium.
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  const createTemplate = async () => {
    setBusy("create");
    setError(null);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meta: { ...STARTER_META, name: "Nueva plantilla" },
          html: STARTER_HTML,
          css: STARTER_CSS,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la plantilla.");
      }
      router.push(`/templates/${data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo crear la plantilla.",
      );
      setBusy(null);
    }
  };

  const duplicate = async (id: string) => {
    setBusy(`duplicate:${id}`);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${id}/duplicate`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo duplicar la plantilla.");
      }
      router.push(`/templates/${data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo duplicar la plantilla.",
      );
      setBusy(null);
    }
  };

  const remove = async (template: TemplateSummary) => {
    if (
      !window.confirm(
        `¿Eliminar «${template.name}»? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setBusy(`delete:${template.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo eliminar la plantilla.");
      }
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo eliminar la plantilla.",
      );
    } finally {
      setBusy(null);
    }
  };

  const importTemplate = async (file: File) => {
    setBusy("import");
    setError(null);
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const parsed = JSON.parse(text) as unknown;
      const response = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar la plantilla.");
      }
      router.push(`/templates/${data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo importar la plantilla.",
      );
      setBusy(null);
    }
  };

  const importFolder = async (files: FileList) => {
    setBusy("import-folder");
    setError(null);
    try {
      const byName = new Map<string, File>();
      for (const file of Array.from(files)) {
        byName.set(file.name.toLowerCase(), file);
      }

      const metaFile = byName.get("template.json");
      const htmlFile = byName.get("template.html");
      const cssFile = byName.get("template.css");

      if (!metaFile) {
        throw new Error(
          "La carpeta debe contener un archivo template.json.",
        );
      }

      const parsed = JSON.parse(
        (await metaFile.text()).replace(/^\uFEFF/, ""),
      ) as unknown;

      if (
        parsed &&
        typeof parsed === "object" &&
        "meta" in parsed &&
        "html" in parsed &&
        "css" in parsed
      ) {
        const response = await fetch("/api/templates/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo importar la carpeta.");
        }
        router.push(`/templates/${data.id}`);
        return;
      }

      if (!htmlFile || !cssFile) {
        throw new Error(
          "La carpeta debe contener template.json, template.html y template.css.",
        );
      }

      const response = await fetch("/api/templates/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meta: parsed,
          html: await htmlFile.text(),
          css: await cssFile.text(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar la carpeta.");
      }
      router.push(`/templates/${data.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo importar la carpeta.",
      );
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importTemplate(file);
          event.target.value = "";
        }}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        accept=".json,.html,.css"
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) void importFolder(files);
          event.target.value = "";
        }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-900">
                Converter
              </span>
              <span className="block text-xs text-slate-500">
                Plantillas HTML/CSS
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Plantillas
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Las plantillas integradas vienen con la app. Las locales se
              guardan en tu equipo, dentro de{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                .data/templates
              </code>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "import" ? "Importando…" : "Importar JSON"}
            </button>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "import-folder" ? "Importando…" : "Importar carpeta"}
            </button>
            <button
              type="button"
              onClick={() => void createTemplate()}
              disabled={busy !== null}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy === "create" ? "Creando…" : "Nueva plantilla"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">
              Todavía no hay plantillas. Creá una para empezar.
            </p>
            <button
              type="button"
              onClick={() => void createTemplate()}
              className="mt-4 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Nueva plantilla
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {template.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {template.id}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {template.builtin ? "Integrada" : "Local"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-500">
                  {template.description || "Sin descripción."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/templates/${template.id}`}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    {template.builtin ? "Ver" : "Editar"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void duplicate(template.id)}
                    disabled={busy !== null}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busy === `duplicate:${template.id}`
                      ? "Duplicando…"
                      : "Duplicar"}
                  </button>
                  <a
                    href={`/api/templates/${template.id}/export`}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Exportar
                  </a>
                  {!template.builtin && (
                    <button
                      type="button"
                      onClick={() => void remove(template)}
                      disabled={busy !== null}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {busy === `delete:${template.id}`
                        ? "Eliminando…"
                        : "Eliminar"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
