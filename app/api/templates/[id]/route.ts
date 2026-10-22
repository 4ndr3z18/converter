import { z } from "zod";
import { templateMetaSchema } from "@/lib/template/model";
import {
  deleteTemplate,
  getTemplate,
  TemplateNotFoundError,
  TemplateReadOnlyError,
  TemplateStoreError,
  updateTemplate,
} from "@/lib/template/store";

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  meta: templateMetaSchema,
  html: z.string().min(1).max(500_000),
  css: z.string().min(1).max(500_000),
});

function failure(error: unknown) {
  if (error instanceof TemplateNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof TemplateReadOnlyError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof TemplateStoreError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: error.issues
          .map((issue) => `${issue.path.join(".") || "plantilla"}: ${issue.message}`)
          .join(" "),
      },
      { status: 400 },
    );
  }
  console.error("[api/templates/:id]", error);
  return Response.json(
    { error: "No se pudo completar la operación con la plantilla." },
    { status: 500 },
  );
}

export async function GET(_request: Request, context: RouteParams) {
  const { id } = await context.params;
  try {
    const template = await getTemplate(id);
    if (!template) {
      return Response.json(
        { error: `La plantilla «${id}» no existe.` },
        { status: 404 },
      );
    }

    return Response.json(
      {
        id: template.id,
        builtin: template.builtin,
        meta: template.meta,
        html: template.html,
        css: template.css,
        updatedAt: template.updatedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request, context: RouteParams) {
  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }

  try {
    const parsed = updateSchema.parse(payload);
    const template = await updateTemplate(id, parsed);
    return Response.json({
      id: template.id,
      builtin: template.builtin,
      meta: template.meta,
      updatedAt: template.updatedAt,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(_request: Request, context: RouteParams) {
  const { id } = await context.params;
  try {
    await deleteTemplate(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
