import { z } from "zod";
import { templateMetaSchema } from "@/lib/template/model";
import {
  createTemplate,
  listTemplateSummaries,
  TemplateStoreError,
} from "@/lib/template/store";

const createSchema = z.object({
  id: z.string().optional(),
  meta: templateMetaSchema,
  html: z.string().min(1).max(500_000),
  css: z.string().min(1).max(500_000),
});

function failure(error: unknown) {
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
  console.error("[api/templates]", error);
  return Response.json(
    { error: "No se pudo completar la operación con plantillas." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const templates = await listTemplateSummaries();
    return Response.json({ templates }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }

  try {
    const parsed = createSchema.parse(payload);
    const template = await createTemplate(parsed);
    return Response.json(
      {
        id: template.id,
        builtin: template.builtin,
        meta: template.meta,
      },
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
