"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  updatedAt: number;
};

type RenderWarning = {
  code?: string;
  severity: "error" | "warning";
  message: string;
  field?: string;
  label?: string;
};

type Status = "idle" | "preview" | "pdf";

const LAST_TEMPLATE_KEY = "converter:last-template";
const MAX_MARKDOWN_BYTES = 2_000_000;

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // sigue con el nombre ASCII
    }
  }

  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}

function flattenData(
  value: unknown,
  prefix = "",
  output: Array<{ key: string; value: string }> = [],
): Array<{ key: string; value: string }> {
  if (output.length >= 24) return output;

  if (Array.isArray(value)) {
    output.push({ key: prefix, value: value.map(String).join(", ") });
    return output;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value)) {
      flattenData(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  if (value === null || value === undefined) return output;
  output.push({ key: prefix, value: String(value) });
  return output;
}

export function Home() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [markdown, setMarkdown] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<RenderWarning[]>([]);
  const [documentData, setDocumentData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await fetch("/api/templates", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las plantillas.");
      }

      const list = (data.templates ?? []) as TemplateSummary[];
      setTemplates(list);

      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LAST_TEMPLATE_KEY)
          : null;
      const next =
        list.find((template) => template.id === stored)?.id ??
        list.find((template) => template.id === "apa7")?.id ??
        list[0]?.id ??
        null;
      setSelectedTemplateId(next);
    } catch (caught) {
      setTemplatesError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar las plantillas.",
      );
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    // La lista de plantillas vive en el servidor local y cambia sin recargar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplates();
  }, [loadTemplates]);

  const renderDocument = useCallback(
    async (source: string, templateId: string) => {
      setStatus("preview");
      setError(null);

      try {
        const response = await fetch("/api/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markdown: source, template: templateId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo preparar la vista previa.");
        }

        setPreviewUrl(`${data.url}?v=${Date.now()}`);
        setWarnings((data.warnings ?? []) as RenderWarning[]);
        setDocumentData((data.data ?? {}) as Record<string, unknown>);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudo preparar la vista previa.",
        );
      } finally {
        setStatus("idle");
      }
    },
    [],
  );

  const selectTemplate = useCallback(
    (id: string) => {
      setSelectedTemplateId(id);
      window.localStorage.setItem(LAST_TEMPLATE_KEY, id);
      if (markdown) void renderDocument(markdown, id);
    },
    [markdown, renderDocument],
  );

  const openFilePicker = () => inputRef.current?.click();

  const handleFile = useCallback(
    async (file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["md", "markdown", "mdown", "txt"].includes(extension)) {
        setError("Elegí un archivo Markdown (.md, .markdown o .txt).");
        return;
      }

      if (file.size > MAX_MARKDOWN_BYTES) {
        setError("El archivo supera los 2 MB.");
        return;
      }

      const templateId = selectedTemplateId;
      if (!templateId) {
        setError("Primero creá una plantilla HTML/CSS.");
        return;
      }

      try {
        const content = await file.text();
        if (!content.trim()) {
          setError("El archivo está vacío.");
          return;
        }

        setMarkdown(content);
        setFileName(file.name);
        setPreviewUrl(null);
        setWarnings([]);
        setError(null);
        await renderDocument(content, templateId);
      } catch {
        setError("No se pudo leer el archivo.");
      }
    },
    [renderDocument, selectedTemplateId],
  );

  const downloadPdf = async () => {
    if (!markdown || !selectedTemplateId) return;

    setStatus("pdf");
    setError(null);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown, template: selectedTemplateId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo generar el PDF.");
      }

      const blob = await response.blob();
      const filename =
        filenameFromDisposition(response.headers.get("content-disposition")) ??
        "documento.pdf";
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo generar el PDF.",
      );
    } finally {
      setStatus("idle");
    }
  };

  const resetDocument = () => {
    setMarkdown("");
    setFileName("");
    setPreviewUrl(null);
    setWarnings([]);
    setDocumentData({});
    setError(null);
  };

  const activeTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const busy = status !== "idle";
  const errors = warnings.filter((warning) => warning.severity === "error");
  const notices = warnings.filter((warning) => warning.severity === "warning");
  const dataRows = flattenData(documentData);

  return (
    <div className="flex min-h-screen flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1800px] items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-900">
                Converter
              </span>
              <span className="block text-xs text-slate-500">
                Markdown a PDF con plantillas HTML/CSS
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/templates"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Plantillas
            </Link>
            {markdown && (
              <button
                type="button"
                onClick={resetDocument}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Inicio
              </button>
            )}
          </div>
        </div>
      </header>

      {!markdown ? (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Empezá por tu documento
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Convertí un Markdown en PDF
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Elegí una plantilla, agregá tu archivo y descargá el PDF. El
              documento se procesa en tu equipo y no se sube a internet.
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={openFilePicker}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className={`group flex h-44 w-44 flex-col items-center justify-center rounded-full border-2 border-dashed bg-white shadow-sm transition ${
                dragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40"
              }`}
              aria-label="Agregar archivo Markdown"
            >
              <span className="text-5xl font-light leading-none text-indigo-600 transition group-hover:scale-110">
                +
              </span>
              <span className="mt-3 px-4 text-center text-xs font-medium leading-tight text-slate-600">
                Agregar archivo
                <br />
                Markdown
              </span>
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            o arrastrá el archivo hasta el botón
          </p>

          {error && (
            <p className="mx-auto mt-4 max-w-xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Plantilla
                </h2>
                <p className="text-xs text-slate-500">
                  Se usará para maquetar el PDF. Podés cambiarla después.
                </p>
              </div>
              <Link
                href="/templates"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Administrar plantillas →
              </Link>
            </div>

            {templatesLoading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : templatesError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{templatesError}</p>
                <button
                  type="button"
                  onClick={() => void loadTemplates()}
                  className="mt-2 font-medium underline"
                >
                  Reintentar
                </button>
              </div>
            ) : templates.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                No hay plantillas todavía.{" "}
                <Link
                  href="/templates"
                  className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Crear la primera
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => {
                  const selected = template.id === selectedTemplateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template.id)}
                      aria-pressed={selected}
                      className={`rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                        selected
                          ? "border-indigo-500 ring-2 ring-indigo-100"
                          : "border-slate-200 hover:border-slate-300 hover:shadow"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {template.name}
                        </span>
                        <span
                          className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border ${
                            selected
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-slate-300 bg-white"
                          }`}
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {template.description || "Sin descripción."}
                      </p>
                      {template.builtin && (
                        <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Integrada
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-[1800px] flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {fileName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeTemplate?.name ?? "Plantilla"}
                </p>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={selectedTemplateId ?? ""}
                  onChange={(event) => selectTemplate(event.target.value)}
                  className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                  aria-label="Plantilla"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cambiar archivo
                </button>
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "pdf" ? "Generando PDF…" : "Descargar PDF"}
                </button>
              </div>
            </div>

            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Vista previa del documento"
                className="h-[calc(100vh-170px)] min-h-[480px] w-full flex-1 border-0 bg-[#e6e9ee]"
              />
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-sm text-slate-500">
                {status === "preview"
                  ? "Generando vista previa…"
                  : "La vista previa aparecerá acá."}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {notices.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                <p className="font-semibold">Avisos</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {notices.slice(0, 4).map((warning) => (
                    <li key={warning.message}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">
                  Faltan {errors.length} campo
                  {errors.length === 1 ? "" : "s"} obligatorio
                  {errors.length === 1 ? "" : "s"}.
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {errors.slice(0, 6).map((warning) => (
                    <li key={warning.message}>{warning.message}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-amber-800">
                  Podés descargar igual: el PDF mostrará marcadores visibles en
                  los campos vacíos.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {activeTemplate?.name ?? "Plantilla"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {activeTemplate?.description || "Sin descripción."}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {activeTemplate?.builtin ? "Integrada" : "Local"}
                </span>
              </div>
              {activeTemplate && (
                <Link
                  href={`/templates/${activeTemplate.id}`}
                  className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Editar plantilla →
                </Link>
              )}
            </div>

            <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Datos detectados
              </summary>
              {dataRows.length > 0 ? (
                <dl className="mt-3 space-y-2 text-xs">
                  {dataRows.map((row) => (
                    <div key={row.key} className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="truncate font-mono text-[10px] text-slate-500">
                        {row.key}
                      </dt>
                      <dd className="break-words text-slate-700">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No se detectó front matter YAML.
                </p>
              )}
            </details>

            <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Editar Markdown
              </summary>
              <textarea
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                spellCheck={false}
                className="mt-3 h-64 w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                aria-label="Contenido Markdown"
              />
              <button
                type="button"
                onClick={() =>
                  selectedTemplateId &&
                  void renderDocument(markdown, selectedTemplateId)
                }
                disabled={busy}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {status === "preview"
                  ? "Actualizando…"
                  : "Actualizar vista previa"}
              </button>
            </details>

            <p className="text-center text-[11px] text-slate-400">
              Procesamiento local · Markdown sin subir a internet
            </p>
          </aside>
        </main>
      )}
    </div>
  );
}
