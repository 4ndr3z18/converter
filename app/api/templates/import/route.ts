import { importTemplate, TemplateStoreError } from "@/lib/template/store";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El archivo debe ser JSON." }, { status: 400 });
  }

  try {
    const template = await importTemplate(payload);
    return Response.json(
      {
        id: template.id,
        builtin: template.builtin,
        meta: template.meta,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TemplateStoreError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/templates/import]", error);
    return Response.json(
      { error: "No se pudo importar la plantilla." },
      { status: 500 },
    );
  }
}
