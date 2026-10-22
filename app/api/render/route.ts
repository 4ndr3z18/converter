import { formatValidationError, prepareRender, renderRequestSchema } from "@/lib/api/render-request";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }

  const parsed = renderRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: formatValidationError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const prepared = await prepareRender(parsed.data);
    return Response.json({
      token: prepared.job.token,
      url: `/print/${prepared.job.token}`,
      warnings: prepared.warnings,
      filename: prepared.filename,
      title: prepared.title,
      template: prepared.templateSlug,
    });
  } catch (error) {
    console.error("[api/render]", error);
    return Response.json(
      { error: "No se pudo preparar el documento." },
      { status: 500 },
    );
  }
}
