/** Utilidades de texto compartidas por el render y las pruebas. */

export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "seccion";
}

export function normalizeTitle(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(input: string): string {
  return escapeHtml(input).replace(/`/g, "&#96;");
}

/** Convierte "Página {{page}} de {{pages}}" en un valor CSS `content`. */
export function cssContentFromFormat(
  format: string,
  resolve: (token: string) => string | null,
): string | null {
  const parts = format.split(/(\{\{\s*[\w.]+\s*\}\})/g).filter((part) => part !== "");
  const output: string[] = [];

  for (const part of parts) {
    const match = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(part);
    if (!match) {
      output.push(JSON.stringify(part));
      continue;
    }

    const token = match[1];
    if (token === "page") {
      output.push("counter(page)");
    } else if (token === "pages") {
      output.push("counter(pages)");
    } else {
      const value = resolve(token) ?? "";
      if (value !== "") output.push(JSON.stringify(value));
    }
  }

  if (output.length === 0) return null;
  return output.join(" ");
}

/** Formatea una fecha ISO (o Date de YAML) en español: "22 de octubre de 2026". */
export function formatLongDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(value);
  }

  if (typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value.trim());
    if (iso) {
      const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) return formatLongDate(date);
    }
  }

  return typeof value === "string" ? value.trim() : "";
}

export function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatLongDate(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatLongDate(trimmed);
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Limpia un nombre de archivo para Windows, macOS y Linux. */
export function sanitizeFilename(input: string, fallback = "documento"): string {
  const clean = input
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 120)
    .trim();

  return clean || fallback;
}
