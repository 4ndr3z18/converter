import { z } from "zod";
import { analyzeHtmlDocument } from "@/lib/render/html-template";
import {
  createRenderJob,
  type TemplateSnapshot,
} from "@/lib/store/render-store";
import { templateDraftSchema } from "@/lib/template/model";
import {
  getDefaultTemplateId,
  getTemplate,
  TemplateStoreError,
} from "@/lib/template/store";
import type { RenderIssue, DocumentData } from "@/lib/render/frontmatter";

export const renderRequestSchema = z.object({
  markdown: z
    .string()
    .min(1, "El documento está vacío.")
    .max(2_000_000, "El documento supera los 2 MB."),
  template: z.string().min(1).optional(),
  templateDraft: templateDraftSchema.optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;

export type PreparedRender = {
  job: Awaited<ReturnType<typeof createRenderJob>>;
  warnings: RenderIssue[];
  filename: string;
  title: string;
  author: string;
  templateSlug: string;
  templateName: string;
  data: DocumentData;
};

export async function prepareRender(
  payload: RenderRequest,
): Promise<PreparedRender> {
  const warnings: RenderIssue[] = [];
  const draft = payload.templateDraft;

  let templateId: string;
  let templateName: string;
  let templateHtml: string;
  let templateCss: string;
  let templateMeta: TemplateSnapshot["meta"];
  let snapshot: TemplateSnapshot | undefined;

  if (draft) {
    const { html, css, ...meta } = draft;
    templateId = "draft";
    templateName = meta.name;
    templateHtml = html;
    templateCss = css;
    templateMeta = meta;
    snapshot = { meta, html, css };
  } else {
    const requested = payload.template
      ? await getTemplate(payload.template)
      : null;

    let selected = requested;
    if (!selected) {
      const fallbackId = await getDefaultTemplateId();
      selected = fallbackId ? await getTemplate(fallbackId) : null;

      if (!selected) {
        throw new TemplateStoreError(
          "No hay plantillas disponibles. Creá una plantilla HTML/CSS para continuar.",
        );
      }

      if (payload.template) {
        warnings.push({
          code: "invalid",
          severity: "warning",
          message: `La plantilla «${payload.template}» no existe; se usó «${selected.meta.name}».`,
        });
      }
    }

    templateId = selected.id;
    templateName = selected.meta.name;
    templateHtml = selected.html;
    templateCss = selected.css;
    templateMeta = selected.meta;
  }

  const template = {
    id: templateId,
    builtin: false,
    meta: templateMeta,
    html: templateHtml,
    css: templateCss,
    updatedAt: Date.now(),
  };

  const analysis = analyzeHtmlDocument(
    payload.markdown,
    template,
    payload.overrides,
  );

  const job = await createRenderJob({
    markdown: payload.markdown,
    template: templateId,
    templateSnapshot: snapshot,
    overrides: payload.overrides,
    filename: analysis.filename,
  });

  return {
    job,
    warnings: [...warnings, ...analysis.warnings],
    filename: analysis.filename,
    title: analysis.title,
    author: analysis.author,
    templateSlug: templateId,
    templateName,
    data: analysis.data,
  };
}

export function formatValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }
  return "La solicitud no es válida.";
}
