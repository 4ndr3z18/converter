import { formatValidationError, prepareRender, renderRequestSchema } from "@/lib/api/render-request";
import { renderPdf } from "@/lib/pdf/chromium";

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
    const origin = new URL(request.url).origin;
    const pdf = await renderPdf(`${origin}/print/${prepared.job.token}`);

    const asciiName = prepared.filename
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_");

    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-length": String(pdf.byteLength),
        "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          prepared.filename,
        )}`,
        "cache-control": "no-store",
        "x-render-warnings": String(prepared.warnings.length),
      },
    });
  } catch (error) {
    console.error("[api/pdf]", error);
    return Response.json(
      {
        error:
          "No se pudo generar el PDF. Revisa que el documento tenga contenido válido.",
      },
      { status: 500 },
    );
  }
}
