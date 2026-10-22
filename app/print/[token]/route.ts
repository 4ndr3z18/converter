import { buildDocument } from "@/lib/render/document";
import { readRenderJob } from "@/lib/store/render-store";
import { resolveTemplate } from "@/lib/template/presets";

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

  const template = resolveTemplate(job.template);

  try {
    const built = buildDocument({
      markdown: job.markdown,
      template,
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
