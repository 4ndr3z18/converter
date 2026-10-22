import { z } from "zod";

export const templateFieldSchema = z.object({
  key: z.string().trim().min(1, "La clave del campo no puede estar vacía."),
  label: z.string().trim().min(1, "La etiqueta del campo no puede estar vacía."),
  required: z.boolean().default(false),
});

export const templateSectionsSchema = z.object({
  abstract: z.array(z.string().trim().min(1)).default(["Resumen", "Abstract"]),
  references: z
    .array(z.string().trim().min(1))
    .default(["Referencias", "References"]),
  appendix: z
    .array(z.string().trim().min(1))
    .default(["Anexo", "Apéndice", "Appendix"]),
});

export const templateNumberingSchema = z.object({
  enabled: z.boolean().default(false),
  format: z.string().default("{{page}}"),
  position: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .default("top-right"),
  skipFirstPage: z.boolean().default(false),
  fontSize: z.number().positive().max(72).default(12),
  fontFamily: z
    .string()
    .default('"Times New Roman", Tinos, "Liberation Serif", serif'),
  color: z.string().default("#000000"),
});

export const templateMetaSchema = z.object({
  name: z.string().trim().min(1, "La plantilla necesita un nombre.").max(120),
  description: z.string().max(1_000).default(""),
  fields: z.array(templateFieldSchema).default([]),
  sections: templateSectionsSchema.default({
    abstract: ["Resumen", "Abstract"],
    references: ["Referencias", "References"],
    appendix: ["Anexo", "Apéndice", "Appendix"],
  }),
  numbering: templateNumberingSchema.default({
    enabled: false,
    format: "{{page}}",
    position: "top-right",
    skipFirstPage: false,
    fontSize: 12,
    fontFamily: '"Times New Roman", Tinos, "Liberation Serif", serif',
    color: "#000000",
  }),
  filenamePattern: z.string().default("{{title}}"),
});

export const templateDraftSchema = templateMetaSchema.extend({
  html: z
    .string()
    .min(1, "La plantilla HTML no puede estar vacía.")
    .max(500_000, "La plantilla HTML es demasiado grande."),
  css: z
    .string()
    .min(1, "La plantilla CSS no puede estar vacía.")
    .max(500_000, "La plantilla CSS es demasiado grande."),
});

export const templateBundleSchema = z.object({
  id: z.string().optional(),
  meta: templateMetaSchema,
  html: z.string().min(1).max(500_000),
  css: z.string().min(1).max(500_000),
});

export type TemplateMeta = z.infer<typeof templateMetaSchema>;
export type TemplateDraft = z.infer<typeof templateDraftSchema>;
export type TemplateBundle = z.infer<typeof templateBundleSchema>;

export type TemplateRecord = {
  id: string;
  builtin: boolean;
  meta: TemplateMeta;
  html: string;
  css: string;
  updatedAt: number;
};

export type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  updatedAt: number;
};
