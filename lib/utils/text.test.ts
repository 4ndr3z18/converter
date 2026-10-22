import { describe, expect, it } from "vitest";
import {
  asText,
  cssContentFromFormat,
  escapeAttribute,
  escapeHtml,
  formatLongDate,
  normalizeTitle,
  sanitizeFilename,
  slugify,
} from "@/lib/utils/text";

describe("slugify", () => {
  it("quita acentos y normaliza separadores", () => {
    expect(slugify("Marco Teórico")).toBe("marco-teorico");
    expect(slugify("  ¿Qué es la IA?  ")).toBe("que-es-la-ia");
  });

  it("usa un slug de respaldo cuando no queda texto", () => {
    expect(slugify("¡¡¡")).toBe("seccion");
  });
});

describe("normalizeTitle", () => {
  it("compara títulos sin acentos, mayúsculas ni espacios extra", () => {
    expect(normalizeTitle("  REFERENCIAS ")).toBe("referencias");
    expect(normalizeTitle("Marco   Teórico")).toBe("marco teorico");
  });
});

describe("escapeHtml", () => {
  it("escapa los caracteres peligrosos", () => {
    expect(escapeHtml(`<strong class="x">'&'</strong>`)).toBe(
      "&lt;strong class=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/strong&gt;",
    );
  });

  it("escapeAttribute también escapa el acento grave", () => {
    expect(escapeAttribute("`valor`")).toBe("&#96;valor&#96;");
  });
});

describe("formatLongDate / asText", () => {
  it("formatea fechas ISO en español", () => {
    expect(formatLongDate("2026-10-22")).toBe("22 de octubre de 2026");
    expect(asText("2026-10-22")).toBe("22 de octubre de 2026");
  });

  it("formatea objetos Date de YAML", () => {
    expect(formatLongDate(new Date("2025-01-05T00:00:00Z"))).toBe(
      "5 de enero de 2025",
    );
  });

  it("deja intacto el texto que no es fecha", () => {
    expect(asText("Lima")).toBe("Lima");
    expect(asText("2026-10")).toBe("2026-10");
  });

  it("une listas con coma", () => {
    expect(asText(["uno", "dos", "tres"])).toBe("uno, dos, tres");
    expect(asText(null)).toBe("");
  });
});

describe("cssContentFromFormat", () => {
  it("convierte los contadores de página en funciones CSS", () => {
    expect(
      cssContentFromFormat("Página {{page}} de {{pages}}", () => null),
    ).toBe('"Página " counter(page) " de " counter(pages)');
  });

  it("resuelve variables del front matter", () => {
    expect(
      cssContentFromFormat("{{course.code}} — {{author.name}}", (key) =>
        key === "course.code" ? "IS-601" : "Pérez",
      ),
    ).toBe('"IS-601" " — " "Pérez"');
  });

  it("devuelve null si no hay contenido", () => {
    expect(cssContentFromFormat("", () => null)).toBeNull();
    expect(cssContentFromFormat("{{desconocido}}", () => null)).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it("elimina caracteres no válidos en sistemas de archivos", () => {
    expect(sanitizeFilename('Informe: "IA" / 2026?')).toBe(
      "Informe IA 2026",
    );
  });

  it("usa el respaldo si el nombre queda vacío", () => {
    expect(sanitizeFilename("...", "documento")).toBe("documento");
  });
});
