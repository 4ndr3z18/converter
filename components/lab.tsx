"use client";

import { useCallback, useEffect, useState } from "react";

type RenderWarning = {
  severity: "error" | "warning";
  message: string;
};

type Status = "idle" | "preview" | "pdf";

type LabProps = {
  initialMarkdown: string;
  templateName: string;
  templateSlug: string;
};

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

export function Lab({ initialMarkdown, templateName, templateSlug }: LabProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<RenderWarning[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(async () => {
    setStatus("preview");
    setError(null);

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown, template: templateSlug }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo preparar la vista previa.");
      }

      setPreviewUrl(`${data.url}?v=${Date.now()}`);
      setWarnings(data.warnings ?? []);
      setDirty(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo preparar la vista previa.",
      );
    } finally {
      setStatus("idle");
    }
  }, [markdown, templateSlug]);

  useEffect(() => {
    // La vista previa inicial consulta el servidor; el estado se actualiza
    // cuando llega la respuesta, no durante el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // Solo al montar: la vista previa inicial se genera con el fixture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async () => {
    setStatus("pdf");
    setError(null);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown, template: templateSlug }),
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

      setWarnings((current) => current);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo generar el PDF.",
      );
    } finally {
      setStatus("idle");
    }
  };

  const busy = status !== "idle";
  const errors = warnings.filter((warning) => warning.severity === "error");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-sm font-bold">
              C
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Converter</p>
              <p className="text-xs text-slate-400">
                Markdown a PDF con plantillas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">
              Fase 0 · motor de render
            </span>
            <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-slate-200 sm:inline">
              {templateName}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 p-4 lg:h-[calc(100vh-61px)] lg:flex-row">
        <section className="flex min-h-[440px] flex-col gap-3 lg:w-[46%]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-sm font-semibold text-slate-900">
                Documento Markdown
              </h1>
              <p className="text-xs text-slate-500">
                Front matter YAML + contenido. La plantilla decide el diseño.
              </p>
            </div>
            {dirty && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                Cambios sin previsualizar
              </span>
            )}
          </div>

          <textarea
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="min-h-[280px] flex-1 resize-none rounded-xl border border-slate-300 bg-white p-4 font-mono text-[12px] leading-[1.55] text-slate-800 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            aria-label="Contenido del documento Markdown"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "preview" ? "Actualizando…" : "Actualizar vista previa"}
            </button>
            <button
              type="button"
              onClick={() => void download()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "pdf" ? "Generando PDF…" : "Descargar PDF"}
            </button>
            <span className="ml-auto text-[11px] text-slate-500">
              Carta · Times New Roman 12 · APA 7
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">
                Faltan {errors.length} campo
                {errors.length === 1 ? "" : "s"} obligatorio
                {errors.length === 1 ? "" : "s"}.
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {errors.slice(0, 6).map((warning) => (
                  <li key={warning.message}>{warning.message}</li>
                ))}
              </ul>
              <p className="mt-1 text-amber-800">
                Puedes previsualizar y descargar igualmente: el PDF mostrará
                marcadores en los campos vacíos.
              </p>
            </div>
          )}

          <details className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              Claves que usa la plantilla APA
            </summary>
            <p className="mt-2 leading-relaxed">
              <code>title</code>, <code>report_type</code>,{" "}
              <code>author.name</code>, <code>author.id</code>,{" "}
              <code>affiliation.university</code>, <code>course.name</code>,{" "}
              <code>professor.name</code>, <code>section</code>,{" "}
              <code>cycle</code>, <code>city</code>, <code>date</code> y{" "}
              <code>keywords</code>. Las secciones del cuerpo empiezan en{" "}
              <code>##</code>.
            </p>
          </details>
        </section>

        <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
            <span className="text-xs font-medium text-slate-600">
              Vista previa paginada
            </span>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
              >
                Abrir en pestaña nueva
              </a>
            )}
          </div>

          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Vista previa del documento"
              className="h-full min-h-[480px] w-full flex-1 border-0 bg-[#e6e9ee]"
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-sm text-slate-500">
              {status === "preview"
                ? "Generando vista previa…"
                : "Actualiza la vista previa para ver el documento."}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
