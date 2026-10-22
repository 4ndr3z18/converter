import { readFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const ASSET_RE = /^[a-f0-9-]{36}\.(png|jpg|webp|gif|svg)$/;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const { id } = await context.params;

  if (!ASSET_RE.test(id)) {
    return new Response("Imagen no encontrada.", { status: 404 });
  }

  const extension = id.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, id));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Imagen no encontrada.", { status: 404 });
  }
}
