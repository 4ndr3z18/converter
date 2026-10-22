import {
  exportTemplate,
  TemplateNotFoundError,
  TemplateStoreError,
} from "@/lib/template/store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const { id } = await context.params;

  try {
    const bundle = await exportTemplate(id);
    const filename = `${id}.template.json`;
    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TemplateStoreError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/templates/export]", error);
    return Response.json(
      { error: "No se pudo exportar la plantilla." },
      { status: 500 },
    );
  }
}
