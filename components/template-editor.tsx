"use client";

import CodeMirror from "@uiw/react-codemirror";
import { css as cssLanguage } from "@codemirror/lang-css";
import { html as htmlLanguage } from "@codemirror/lang-html";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TemplateMeta } from "@/lib/template/model";

type TemplateResponse = {
  id: string;
  builtin: boolean;
  meta: TemplateMeta;
  html: string;
  css: string;
  updatedAt: number;
};

type Tab = "html" | "css" | "meta";

type PreviewWarning = {
  severity: "error" | "warning";
  message: string;
};

export function TemplateEditor({ id }: { id: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [meta, setMeta] = useState<TemplateMeta | null>(null);
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [tab, setTab] = useState<Tab>("html");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<PreviewWarning[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [previewName, setPreviewName] = useState("Ejemplo APA");
  const [assets, setAssets] = useState<Array<{ id: string; url: string }>>([]);

  const sampleLoaded = useRef(false);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la plantilla.");
      }

      const record = data as TemplateResponse;
      setTemplate(record);
      setMeta(record.meta);
      setHtml(record.html);
      setCss(record.css);
      setSavedSnapshot(
        JSON.stringify({
          meta: record.meta,
          html: record.html,
          css: record.css,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar la plantilla.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (sampleLoaded.current) return;
    sampleLoaded.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/sample", { cache: "no-store" });
        if (!response.ok) return;
        const text = await response.text();
        setPreviewMarkdown(text);
      } catch {
        // La vista previa puede funcionar con un documento cargado a mano.
      }
    })();
  }, []);

  const refreshPreview = useCallback(async () => {
    if (!meta || !html.trim() || !css.trim() || !previewMarkdown.trim()) {
      return;
    }

    setPreviewing(true);
    setPreviewError(null);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          markdown: previewMarkdown,
          templateDraft: { ...meta, html, css },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar la vista previa.");
      }
      setPreviewUrl(`${data.url}?v=${Date.now()}`);
      setPreviewWarnings((data.warnings ?? []) as PreviewWarning[]);
    } catch (caught) {
      setPreviewError(
        caught instanceof Error
          ? caught.message
          : "No se pudo generar la vista previa.",
      );
    } finally {
      setPreviewing(false);
    }
  }, [css, html, meta, previewMarkdown]);

  useEffect(() => {
    if (!meta || !html.trim() || !css.trim() || !previewMarkdown.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [css, html, meta, previewMarkdown, refreshPreview]);

  const dirty =
    template !== null &&
    savedSnapshot !== JSON.stringify({ meta, html, css });

  const updateMeta = (patch: Partial<TemplateMeta>) => {
    setMeta((current) => (current ? { ...current, ...patch } : current));
  };

  const updateNumbering = (patch: Partial<TemplateMeta["numbering"]>) => {
    setMeta((current) =>
      current
        ? {
            ...current,
            numbering: { ...current.numbering, ...patch },
          }
        : current,
    );
  };

  const updateSections = (
    key: keyof TemplateMeta["sections"],
    value: string,
  ) => {
    const list = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setMeta((current) =>
      current
        ? {
            ...current,
            sections: { ...current.sections, [key]: list },
          }
        : current,
    );
  };

  const updateField = (
    index: number,
    patch: Partial<TemplateMeta["fields"][number]>,
  ) => {
    setMeta((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field, cursor) =>
              cursor === index ? { ...field, ...patch } : field,
            ),
          }
        : current,
    );
  };

  const addField = () => {
    setMeta((current) =>
      current
        ? {
            ...current,
            fields: [
              ...current.fields,
              { key: "", label: "", required: false },
            ],
          }
        : current,
    );
  };

  const removeField = (index: number) => {
    setMeta((current) =>
      current
        ? {
            ...current,
            fields: current.fields.filter((_, cursor) => cursor !== index),
          }
        : current,
    );
  };

  const save = async () => {
    if (!template || !meta || template.builtin) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ meta, html, css }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la plantilla.");
      }
      setTemplate({ ...template, ...data, html, css });
      setSavedSnapshot(JSON.stringify({ meta, html, css }));
      setNotice("Plantilla guardada.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar la plantilla.",
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    setDuplicating(true);
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
      setDuplicating(false);
    }
  };

  const remove = async () => {
    if (!template || template.builtin) return;
    if (!window.confirm(`¿Eliminar «${template.meta.name}»?`)) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo eliminar la plantilla.");
      }
      router.push("/templates");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo eliminar la plantilla.",
      );
      setDeleting(false);
    }
  };

  const uploadAsset = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/assets", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir la imagen.");
      }
      setAssets((current) => [
        ...current,
        { id: data.id as string, url: data.url as string },
      ]);
      setNotice("Imagen subida. Copiá la URL y usala en el HTML.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  };

  const loadPreviewFile = async (file: File) => {
    try {
      const text = await file.text();
      setPreviewMarkdown(text);
      setPreviewName(file.name);
      setPreviewUrl(null);
    } catch {
      setPreviewError("No se pudo leer el documento de prueba.");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-sm text-slate-500">
        Cargando plantilla…
      </div>
    );
  }

  if (!template || !meta) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-sm text-slate-600">
          {error ?? "La plantilla no existe."}
        </p>
        <Link
          href="/templates"
          className="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Volver a plantillas
        </Link>
      </div>
    );
  }

  const readonly = template.builtin;

  return (
    <div className="flex min-h-screen flex-col">
      <input
        ref={assetInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadAsset(file);
          event.target.value = "";
        }}
      />
      <input
        ref={previewInputRef}
        type="file"
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadPreviewFile(file);
          event.target.value = "";
        }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-3 px-5 py-3">
          <Link href="/templates" className="text-sm font-medium text-slate-600">
            ← Plantillas
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {meta.name}
            </p>
            <p className="font-mono text-[10px] text-slate-400">
              {template.id} · {readonly ? "integrada" : "local"}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {dirty && !readonly && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                Sin guardar
              </span>
            )}
            <button
              type="button"
              onClick={() => void refreshPreview()}
              disabled={previewing}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {previewing ? "Previsualizando…" : "Actualizar vista previa"}
            </button>
            <button
              type="button"
              onClick={() => void duplicate()}
              disabled={duplicating}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {duplicating ? "Duplicando…" : "Duplicar"}
            </button>
            <a
              href={`/api/templates/${id}/export`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Exportar
            </a>
            {!readonly && (
              <>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={deleting}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {readonly && (
        <div className="border-b border-indigo-100 bg-indigo-50 px-5 py-2 text-center text-xs text-indigo-800">
          Esta plantilla es integrada y de solo lectura. Duplicala para
          modificarla.
        </div>
      )}

      {(error || notice) && (
        <div className="mx-auto w-full max-w-[1800px] px-4 pt-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </div>
          )}
        </div>
      )}

      <main className="mx-auto grid w-full max-w-[1800px] flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2">
            {(
              [
                ["html", "HTML"],
                ["css", "CSS"],
                ["meta", "Metadatos"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${
                  tab === value
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pb-1">
              <button
                type="button"
                onClick={() => assetInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
            </div>
          </div>

          {tab === "html" && (
            <CodeMirror
              value={html}
              height="560px"
              extensions={[htmlLanguage()]}
              onChange={setHtml}
              readOnly={readonly}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: !readonly,
              }}
              className="text-[13px]"
            />
          )}

          {tab === "css" && (
            <CodeMirror
              value={css}
              height="560px"
              extensions={[cssLanguage()]}
              onChange={setCss}
              readOnly={readonly}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: !readonly,
              }}
              className="text-[13px]"
            />
          )}

          {tab === "meta" && (
            <div className="h-[560px] space-y-5 overflow-y-auto p-5 text-sm">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Nombre
                </span>
                <input
                  value={meta.name}
                  onChange={(event) => updateMeta({ name: event.target.value })}
                  disabled={readonly}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Descripción
                </span>
                <textarea
                  value={meta.description}
                  onChange={(event) =>
                    updateMeta({ description: event.target.value })
                  }
                  disabled={readonly}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Patrón del nombre del PDF
                </span>
                <input
                  value={meta.filenamePattern}
                  onChange={(event) =>
                    updateMeta({ filenamePattern: event.target.value })
                  }
                  disabled={readonly}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Ejemplo: {"{{report_type}} - {{author.name}}"}
                </span>
              </label>

              <fieldset>
                <legend className="text-xs font-medium text-slate-600">
                  Numeración
                </legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={meta.numbering.enabled}
                      onChange={(event) =>
                        updateNumbering({ enabled: event.target.checked })
                      }
                      disabled={readonly}
                    />
                    Mostrar número de página
                  </label>
                  <label className="text-xs text-slate-600">
                    Posición
                    <select
                      value={meta.numbering.position}
                      onChange={(event) =>
                        updateNumbering({
                          position: event.target
                            .value as TemplateMeta["numbering"]["position"],
                        })
                      }
                      disabled={readonly}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-50"
                    >
                      <option value="top-left">Arriba izquierda</option>
                      <option value="top-center">Arriba centro</option>
                      <option value="top-right">Arriba derecha</option>
                      <option value="bottom-left">Abajo izquierda</option>
                      <option value="bottom-center">Abajo centro</option>
                      <option value="bottom-right">Abajo derecha</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-600">
                    Formato
                    <input
                      value={meta.numbering.format}
                      onChange={(event) =>
                        updateNumbering({ format: event.target.value })
                      }
                      disabled={readonly}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs disabled:bg-slate-50"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Tamaño (pt)
                    <input
                      type="number"
                      min={6}
                      max={72}
                      value={meta.numbering.fontSize}
                      onChange={(event) =>
                        updateNumbering({
                          fontSize: Number(event.target.value) || 12,
                        })
                      }
                      disabled={readonly}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-50"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={meta.numbering.skipFirstPage}
                      onChange={(event) =>
                        updateNumbering({
                          skipFirstPage: event.target.checked,
                        })
                      }
                      disabled={readonly}
                    />
                    Omitir en la primera página
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-medium text-slate-600">
                  Secciones especiales
                </legend>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      ["abstract", "Resumen"],
                      ["references", "Referencias"],
                      ["appendix", "Anexos"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-xs text-slate-600">
                      {label}
                      <input
                        value={meta.sections[key].join(", ")}
                        onChange={(event) =>
                          updateSections(key, event.target.value)
                        }
                        disabled={readonly}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-50"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-medium text-slate-600">
                    Campos del documento
                  </legend>
                  {!readonly && (
                    <button
                      type="button"
                      onClick={addField}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      + Agregar campo
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {meta.fields.map((field, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2"
                    >
                      <input
                        value={field.key}
                        onChange={(event) =>
                          updateField(index, { key: event.target.value })
                        }
                        placeholder="author.name"
                        disabled={readonly}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-[11px] disabled:bg-slate-50"
                      />
                      <input
                        value={field.label}
                        onChange={(event) =>
                          updateField(index, { label: event.target.value })
                        }
                        placeholder="Autor"
                        disabled={readonly}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] disabled:bg-slate-50"
                      />
                      <label className="flex items-center gap-1 text-[10px] text-slate-500">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) =>
                            updateField(index, {
                              required: event.target.checked,
                            })
                          }
                          disabled={readonly}
                        />
                        Obligatorio
                      </label>
                      {!readonly && (
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="rounded px-1.5 py-1 text-[11px] text-red-500 hover:bg-red-50"
                          aria-label={`Eliminar campo ${field.key}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>

              {assets.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Imágenes subidas
                  </p>
                  <ul className="mt-2 space-y-1">
                    {assets.map((asset) => (
                      <li key={asset.id}>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(asset.url);
                            setNotice("URL copiada al portapapeles.");
                          }}
                          className="w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-mono text-[10px] text-slate-600 hover:bg-slate-100"
                        >
                          {asset.url}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-600">
                Vista previa
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {previewName}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => previewInputRef.current?.click()}
                className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Documento de prueba
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                >
                  Abrir
                </a>
              )}
            </div>
          </div>

          {previewError && (
            <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {previewError}
            </div>
          )}
          {previewWarnings.length > 0 && (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {previewWarnings.length} aviso
              {previewWarnings.length === 1 ? "" : "s"} en el documento de
              prueba.
            </div>
          )}

          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Vista previa de la plantilla"
              className="h-[calc(100vh-230px)] min-h-[480px] w-full flex-1 border-0 bg-[#e6e9ee]"
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500">
              {previewing
                ? "Generando vista previa…"
                : "La vista previa aparecerá cuando haya un documento de prueba."}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
