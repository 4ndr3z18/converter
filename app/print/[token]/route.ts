import { buildHtmlDocument } from "@/lib/render/html-template";
import { readRenderJob } from "@/lib/store/render-store";
import { getTemplate } from "@/lib/template/store";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const { token } = await context.params;
  const job = await readRenderJob(token);

  if (!job) {
    return new Response("Documento no encontrado o expirado.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  try {
    const stored = job.templateSnapshot
      ? {
          id: job.template,
          builtin: false,
          meta: job.templateSnapshot.meta,
          html: job.templateSnapshot.html,
          css: job.templateSnapshot.css,
          updatedAt: Date.now(),
        }
      : await getTemplate(job.template);

    if (!stored) {
      return new Response("La plantilla de este documento ya no existe.", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const built = buildHtmlDocument({
      markdown: job.markdown,
      template: stored,
      overrides: job.overrides,
    });

    return new Response(built.html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[print]", error);
    return new Response("No se pudo preparar el documento.", {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
