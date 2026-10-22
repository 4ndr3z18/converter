import { describe, expect, it } from "vitest";
import {
  applyOverrides,
  buildFilenameFromPattern,
  getValue,
  parseFrontMatter,
  resolvePattern,
  setValue,
  validateTemplateFields,
} from "@/lib/render/frontmatter";

const REQUIRED_FIELDS = [
  { key: "title", label: "Título del informe", required: true },
  { key: "report_type", label: "Tipo de informe", required: true },
  { key: "author.name", label: "Apellidos y nombres del alumno", required: true },
  { key: "author.id", label: "Código de alumno", required: true },
  { key: "affiliation.university", label: "Universidad", required: true },
  { key: "course.name", label: "Asignatura", required: true },
  { key: "professor.name", label: "Docente", required: true },
  { key: "date", label: "Fecha de entrega", required: true },
];

const VALID_FRONT_MATTER = `---
title: "Adopción de IA en equipos universitarios"
report_type: "Informe de investigación"
author:
  name: "Pérez Quispe, Ana Lucía"
  id: "20231234"
affiliation:
  university: "Universidad Nacional de Ejemplo"
  faculty: "Facultad de Ingeniería"
course:
  name: "Ingeniería de Software"
  code: "IS-601"
professor:
  name: "Ramírez Torres, Carlos"
section: "A"
cycle: "2026-I"
city: "Lima"
date: "2026-10-22"
keywords: "inteligencia artificial, gestión de proyectos"
---
`;

describe("parseFrontMatter", () => {
  it("extrae el mapa YAML y separa el cuerpo", () => {
    const result = parseFrontMatter(`${VALID_FRONT_MATTER}\n## Introducción\n\nTexto.`);

    expect(result.issues).toEqual([]);
    expect(getValue(result.data, "author.name")).toBe(
      "Pérez Quispe, Ana Lucía",
    );
    expect(getValue(result.data, "course.code")).toBe("IS-601");
    expect(result.body).toBe("## Introducción\n\nTexto.");
  });

  it("acepta documentos sin front matter", () => {
    const result = parseFrontMatter("## Solo cuerpo\n");

    expect(result.data).toEqual({});
    expect(result.body).toBe("## Solo cuerpo\n");
    expect(result.issues).toEqual([]);
  });

  it("reporta YAML inválido sin romper el render", () => {
    const result = parseFrontMatter("---\ntitle: [sin cerrar\n---\n\nCuerpo");

    expect(result.data).toEqual({});
    expect(result.issues[0]?.code).toBe("yaml");
    expect(result.issues[0]?.severity).toBe("error");
    expect(result.body).toBe("Cuerpo");
  });

  it("rechaza un front matter que no sea un mapa", () => {
    const result = parseFrontMatter("---\n- uno\n- dos\n---\n\nCuerpo");

    expect(result.data).toEqual({});
    expect(result.issues[0]?.message).toContain("mapa");
  });
});

describe("getValue / setValue / applyOverrides", () => {
  it("lee y escribe rutas anidadas", () => {
    const data: Record<string, unknown> = {};
    setValue(data, "affiliation.university", "Universidad de Prueba");

    expect(getValue(data, "affiliation.university")).toBe(
      "Universidad de Prueba",
    );
  });

  it("aplica overrides anidados sin mutar el original", () => {
    const original = { author: { name: "Original" }, city: "Lima" };
    const result = applyOverrides(original, {
      "author.name": "Corregido",
      city: "Arequipa",
    });

    expect(result).toEqual({
      author: { name: "Corregido" },
      city: "Arequipa",
    });
    expect(original.author.name).toBe("Original");
  });

  it("ignora overrides con valor undefined", () => {
    expect(applyOverrides({ title: "Uno" }, { title: undefined })).toEqual({
      title: "Uno",
    });
  });

  it("ignora rutas que intentan modificar prototipos", () => {
    const result = applyOverrides(
      { title: "Seguro" },
      {
        "__proto__.polluted": true,
        "constructor.prototype.polluted": true,
        prototype: { polluted: true },
        city: "Lima",
      },
    );

    expect(result).toEqual({ title: "Seguro", city: "Lima" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("validateTemplateFields", () => {
  it("no reporta nada cuando están todos los campos obligatorios", () => {
    const { data } = parseFrontMatter(VALID_FRONT_MATTER);

    expect(validateTemplateFields(REQUIRED_FIELDS, data)).toEqual([]);
  });

  it("marca cada campo obligatorio ausente", () => {
    const issues = validateTemplateFields(REQUIRED_FIELDS, {
      title: "Solo el título",
    });
    const fields = issues.map((issue) => issue.field);

    expect(fields).toContain("report_type");
    expect(fields).toContain("author.name");
    expect(fields).toContain("date");
    expect(issues.every((issue) => issue.code === "missing")).toBe(true);
    expect(issues.every((issue) => issue.severity === "error")).toBe(true);
  });
});

describe("resolvePattern / buildFilenameFromPattern", () => {
  it("sustituye las variables del patrón", () => {
    expect(
      resolvePattern("{{report_type}} - {{ author.name }}", (key) =>
        key === "report_type" ? "Informe" : "Pérez",
      ),
    ).toBe("Informe - Pérez");
  });

  it("genera un nombre de archivo seguro y con extensión", () => {
    const { data } = parseFrontMatter(VALID_FRONT_MATTER);

    expect(
      buildFilenameFromPattern(
        "{{report_type}} - {{author.name}}",
        data,
      ),
    ).toBe("Informe de investigación - Pérez Quispe, Ana Lucía.pdf");
  });

  it("usa un nombre de respaldo cuando faltan los datos", () => {
    expect(buildFilenameFromPattern("{{title}}", {})).toBe("documento.pdf");
  });
});
