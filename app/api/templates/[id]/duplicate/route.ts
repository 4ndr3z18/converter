import {
  duplicateTemplate,
  TemplateNotFoundError,
  TemplateStoreError,
} from "@/lib/template/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteParams) {
  const { id } = await context.params;

  try {
    const template = await duplicateTemplate(id);
    return Response.json(
      {
        id: template.id,
        builtin: template.builtin,
        meta: template.meta,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TemplateStoreError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/templates/duplicate]", error);
    return Response.json(
      { error: "No se pudo duplicar la plantilla." },
      { status: 500 },
    );
  }
}
