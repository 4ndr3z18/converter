import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Se esperaba un formulario multipart." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "La imagen supera los 5 MB." },
      { status: 400 },
    );
  }

  const type = file.type.toLowerCase();
  const extension =
    EXTENSIONS[type] ??
    (() => {
      const ext = path.extname(file.name).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)
        ? ext === ".jpeg"
          ? ".jpg"
          : ext
        : null;
    })();

  if (!extension) {
    return Response.json(
      { error: "Formato no admitido. Usá PNG, JPG, WEBP, GIF o SVG." },
      { status: 400 },
    );
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const id = randomUUID();
    const filename = `${id}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);

    return Response.json(
      { id, url: `/api/assets/${filename}` },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/assets]", error);
    return Response.json(
      { error: "No se pudo guardar la imagen." },
      { status: 500 },
    );
  }
}
