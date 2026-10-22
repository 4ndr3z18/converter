import { z } from "zod";
import { analyzeDocument } from "@/lib/render/document";
import { createRenderJob } from "@/lib/store/render-store";
import { getTemplate, resolveTemplate } from "@/lib/template/presets";
import type { RenderIssue } from "@/lib/render/frontmatter";

export const renderRequestSchema = z.object({
  markdown: z
    .string()
    .min(1, "El documento está vacío.")
    .max(2_000_000, "El documento supera los 2 MB."),
  template: z.string().min(1).optional(),
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
};

export async function prepareRender(
  payload: RenderRequest,
): Promise<PreparedRender> {
  const requested = payload.template ? getTemplate(payload.template) : null;
  const template = requested ?? resolveTemplate(payload.template);
  const analysis = analyzeDocument(payload.markdown, template, payload.overrides);

  const warnings = [...analysis.warnings];
  if (payload.template && !requested) {
    warnings.push({
      code: "invalid",
      severity: "warning",
      message: `La plantilla «${payload.template}» no existe; se usó «${template.name}».`,
    });
  }

  const job = await createRenderJob({
    markdown: payload.markdown,
    template: template.slug,
    overrides: payload.overrides,
    filename: analysis.filename,
  });

  return {
    job,
    warnings,
    filename: analysis.filename,
    title: analysis.title,
    author: analysis.author,
    templateSlug: template.slug,
  };
}

export function formatValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }
  return "La solicitud no es válida.";
}
