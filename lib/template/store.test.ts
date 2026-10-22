import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTemplate,
  DEFAULT_TEMPLATE_ID,
  deleteTemplate,
  duplicateTemplate,
  exportTemplate,
  getDefaultTemplateId,
  getTemplate,
  importTemplate,
  listTemplates,
  TemplateReadOnlyError,
  updateTemplate,
} from "@/lib/template/store";
import { templateMetaSchema } from "@/lib/template/model";

const created: string[] = [];

function uniqueName(label = "prueba") {
  return `${label}-${randomUUID().slice(0, 8)}`;
}

async function makeTemplate(name = uniqueName()) {
  const template = await createTemplate({
    meta: templateMetaSchema.parse({
      name,
      description: "Plantilla de prueba",
      fields: [{ key: "title", label: "Título", required: true }],
    }),
    html: "<main class=\"doc\">{{{content}}}</main>",
    css: "body { font-family: serif; }",
  });
  created.push(template.id);
  return template;
}

afterEach(async () => {
  while (created.length > 0) {
    const id = created.pop();
    if (!id) continue;
    await deleteTemplate(id).catch(() => undefined);
  }
});

describe("template store", () => {
  it("incluye la plantilla APA integrada y la devuelve completa", async () => {
    const templates = await listTemplates();
    expect(templates.some((template) => template.id === DEFAULT_TEMPLATE_ID)).toBe(
      true,
    );

    const apa = await getTemplate(DEFAULT_TEMPLATE_ID);
    expect(apa?.builtin).toBe(true);
    expect(apa?.meta.name).toContain("APA 7");
    expect(apa?.html).toContain('{{field "title"');
    expect(apa?.html).toContain("{{#each bodySections}}");
    expect(apa?.css).toContain("@page");
    expect(await getDefaultTemplateId()).toBe(DEFAULT_TEMPLATE_ID);
  });

  it("crea, actualiza, duplica y elimina una plantilla local", async () => {
    const template = await makeTemplate();
    expect(template.builtin).toBe(false);

    const updated = await updateTemplate(template.id, {
      meta: { ...template.meta, name: `${template.meta.name} v2` },
      html: "<main>{{title}}</main>",
      css: "main { color: black; }",
    });
    expect(updated.meta.name).toContain("v2");

    const copy = await duplicateTemplate(template.id);
    created.push(copy.id);
    expect(copy.id).not.toBe(template.id);
    expect(copy.meta.name).toContain("(copia)");

    await deleteTemplate(template.id);
    expect(await getTemplate(template.id)).toBeNull();
  });

  it("protege las plantillas integradas contra escritura y borrado", async () => {
    const apa = await getTemplate(DEFAULT_TEMPLATE_ID);
    expect(apa).not.toBeNull();

    await expect(
      updateTemplate(DEFAULT_TEMPLATE_ID, {
        meta: apa!.meta,
        html: apa!.html,
        css: apa!.css,
      }),
    ).rejects.toBeInstanceOf(TemplateReadOnlyError);

    await expect(deleteTemplate(DEFAULT_TEMPLATE_ID)).rejects.toBeInstanceOf(
      TemplateReadOnlyError,
    );
  });

  it("exporta e importa una plantilla como paquete JSON", async () => {
    const template = await makeTemplate();

    const bundle = await exportTemplate(template.id);
    expect(bundle.id).toBe(template.id);
    expect(bundle.meta.name).toBe(template.meta.name);

    const imported = await importTemplate({
      ...bundle,
      id: undefined,
      meta: { ...bundle.meta, name: `${bundle.meta.name} importada` },
    });
    created.push(imported.id);

    expect(imported.meta.name).toContain("importada");
    expect(imported.html).toBe(template.html);
    expect(imported.css).toBe(template.css);
  });
});
