import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const sample = await readFile(
      path.join(process.cwd(), "fixtures", "apa-demo.md"),
      "utf8",
    );
    return new Response(sample, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "No se encontró el documento de prueba." },
      { status: 404 },
    );
  }
}
