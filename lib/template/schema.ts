import { z } from "zod";

/**
 * Esquema de una plantilla de documento.
 *
 * La plantilla describe todo lo que el markdown *no* describe: página,
 * tipografía, portada, cabecera/pie, referencias y el contrato de campos
 * que debe traer el front matter del archivo .md.
 */

export const PAGE_SIZES = {
  Letter: { width: 215.9, height: 279.4, label: "Carta (8.5 × 11 in)" },
  A4: { width: 210, height: 297, label: "A4 (210 × 297 mm)" },
  Legal: { width: 215.9, height: 355.6, label: "Legal (8.5 × 14 in)" },
  A5: { width: 148, height: 210, label: "A5 (148 × 210 mm)" },
} as const;

export type PageSizeName = keyof typeof PAGE_SIZES;

export const pageSizeSchema = z.enum(["Letter", "A4", "Legal", "A5"]);

const marginSchema = z.object({
  top: z.number().nonnegative(),
  right: z.number().nonnegative(),
  bottom: z.number().nonnegative(),
  left: z.number().nonnegative(),
});

const bodyTypographySchema = z.object({
  fontFamily: z.string().min(1),
  fontSize: z.number().positive(),
  lineHeight: z.number().positive(),
  align: z.enum(["left", "justify"]),
  firstLineIndent: z.number().nonnegative(),
  spaceBefore: z.number().nonnegative(),
  spaceAfter: z.number().nonnegative(),
  color: z.string().min(1),
});

const headingLevelSchema = z.object({
  /** Nivel del heading en markdown (2 = ##, 3 = ###...). */
  markdownLevel: z.number().int().min(1).max(6),
  size: z.number().positive(),
  weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]),
  italic: z.boolean(),
  align: z.enum(["left", "center"]),
  indent: z.number().nonnegative(),
  /** Si es true, el texto del párrafo continúa en la misma línea del título. */
  runIn: z.boolean(),
  spaceBefore: z.number().nonnegative(),
  spaceAfter: z.number().nonnegative(),
  keepWithNext: z.boolean(),
  borderBottom: z.boolean(),
  color: z.string().optional(),
});

const coverSchema = z.object({
  enabled: z.boolean(),
  layout: z.enum(["apa-institutional", "centered", "banner"]),
  logo: z.string().nullable(),
  logoHeight: z.number().positive(),
  titleOffsetTop: z.number().nonnegative(),
  showReportType: z.boolean(),
  /** Claves del front matter que se muestran, en el orden canónico del layout. */
  showFields: z.array(z.string()),
  showMissingMarkers: z.boolean(),
});

const chromeBlockSchema = z.object({
  enabled: z.boolean(),
  left: z.string(),
  center: z.string(),
  right: z.string(),
  skipFirstPage: z.boolean(),
  fontSize: z.number().positive(),
});

const pageNumberSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(["top-right", "top-center", "bottom-center", "bottom-right"]),
  format: z.string(),
  skipFirstPage: z.boolean(),
});

const documentFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  group: z.string().default("General"),
  type: z
    .enum(["text", "longtext", "date", "select", "number", "url", "list"])
    .default("text"),
  required: z.boolean(),
  example: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const outlineEntrySchema = z.object({
  level: z.number().int().min(2).max(6),
  title: z.string().min(1),
  hint: z.string().optional(),
});

export const templateDefinitionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "El slug solo admite minúsculas, números y guiones."),
  name: z.string().min(1),
  description: z.string(),
  preset: z.string().optional(),
  schemaVersion: z.literal(1),

  page: z.object({
    size: pageSizeSchema,
    orientation: z.enum(["portrait", "landscape"]),
    margin: marginSchema,
  }),

  colors: z.object({
    text: z.string().min(1),
    muted: z.string().min(1),
    accent: z.string().min(1),
    rule: z.string().min(1),
    background: z.string().min(1),
  }),

  typography: z.object({
    body: bodyTypographySchema,
    table: z.object({
      fontFamily: z.string().min(1),
      fontSize: z.number().positive(),
      lineHeight: z.number().positive(),
    }),
    code: z.object({
      fontFamily: z.string().min(1),
      fontSize: z.number().positive(),
      lineHeight: z.number().positive(),
      background: z.string().min(1),
      borderColor: z.string().min(1),
    }),
    caption: z.object({
      fontSize: z.number().positive(),
      lineHeight: z.number().positive(),
    }),
  }),

  headings: z.object({
    case: z.enum(["sentence", "title"]),
    levels: z.array(headingLevelSchema).min(1),
  }),

  cover: coverSchema,
  abstract: z.object({
    enabled: z.boolean(),
    title: z.string().min(1),
    keywordsField: z.string().min(1),
    keywordsLabel: z.string().min(1),
    newPage: z.boolean(),
  }),

  toc: z.object({
    enabled: z.boolean(),
    title: z.string().min(1),
    /** 1 = solo h2, 2 = h2 y h3, 3 = h2, h3 y h4. */
    depth: z.number().int().min(1).max(5),
    dotLeaders: z.boolean(),
  }),

  chrome: z.object({
    header: chromeBlockSchema,
    footer: chromeBlockSchema,
    pageNumber: pageNumberSchema,
  }),

  references: z.object({
    titles: z.array(z.string().min(1)).min(1),
    hangingIndent: z.boolean(),
    stripBullets: z.boolean(),
    sort: z.boolean(),
    newPage: z.boolean(),
  }),

  tables: z.object({
    style: z.enum(["apa", "grid"]),
    zebra: z.boolean(),
    fontSize: z.number().positive().nullable(),
  }),

  figures: z.object({
    style: z.enum(["apa", "plain"]),
    captionPosition: z.enum(["above", "below"]),
  }),

  blockquote: z.object({
    indent: z.number().nonnegative(),
    italic: z.boolean(),
  }),

  watermark: z.object({
    enabled: z.boolean(),
    text: z.string(),
    opacity: z.number().min(0).max(1),
    angle: z.number(),
    size: z.number().positive(),
    color: z.string().min(1),
  }),

  body: z.object({
    repeatTitleOnFirstPage: z.boolean(),
  }),

  document: z.object({
    fields: z.array(documentFieldSchema),
    outline: z.array(outlineEntrySchema),
    filenamePattern: z.string().min(1),
  }),
});

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
export type DocumentField = z.infer<typeof documentFieldSchema>;
export type HeadingLevel = z.infer<typeof headingLevelSchema>;

export function parseTemplate(input: unknown): TemplateDefinition {
  return templateDefinitionSchema.parse(input);
}

export function pageDimensions(template: TemplateDefinition): {
  width: number;
  height: number;
} {
  const base = PAGE_SIZES[template.page.size];
  return template.page.orientation === "landscape"
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };
}
