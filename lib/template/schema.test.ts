import { describe, expect, it } from "vitest";
import {
  PAGE_SIZES,
  pageDimensions,
  parseTemplate,
  templateDefinitionSchema,
} from "@/lib/template/schema";
import { APA7_TEMPLATE } from "@/lib/template/presets/apa7";

describe("plantilla APA 7", () => {
  it("pasa la validación del esquema", () => {
    const parsed = parseTemplate(APA7_TEMPLATE);

    expect(parsed.slug).toBe("apa7-informe");
    expect(parsed.page.size).toBe("Letter");
    expect(parsed.typography.body.fontSize).toBe(12);
    expect(parsed.typography.body.lineHeight).toBe(2);
    expect(parsed.page.margin).toEqual({
      top: 25.4,
      right: 25.4,
      bottom: 25.4,
      left: 25.4,
    });
  });

  it("usa Carta en orientación vertical", () => {
    expect(pageDimensions(APA7_TEMPLATE)).toEqual({
      width: 215.9,
      height: 279.4,
    });
  });

  it("intercambia las dimensiones en horizontal", () => {
    const landscape = parseTemplate({
      ...APA7_TEMPLATE,
      page: { ...APA7_TEMPLATE.page, orientation: "landscape" },
    });

    expect(pageDimensions(landscape)).toEqual({
      width: 279.4,
      height: 215.9,
    });
  });

  it("tiene los tamaños de página esperados", () => {
    expect(PAGE_SIZES.Letter.width).toBe(215.9);
    expect(PAGE_SIZES.Letter.height).toBe(279.4);
    expect(PAGE_SIZES.A4.width).toBe(210);
    expect(PAGE_SIZES.A4.height).toBe(297);
  });
});

describe("validación del esquema", () => {
  it("rechaza slugs con mayúsculas o símbolos", () => {
    expect(() =>
      templateDefinitionSchema.parse({
        ...APA7_TEMPLATE,
        slug: "APA 7/Informe",
      }),
    ).toThrow();
  });

  it("rechaza tamaños de página desconocidos", () => {
    expect(() =>
      templateDefinitionSchema.parse({
        ...APA7_TEMPLATE,
        page: { ...APA7_TEMPLATE.page, size: "Oficio" },
      }),
    ).toThrow();
  });

  it("rechaza valores negativos en los márgenes", () => {
    expect(() =>
      templateDefinitionSchema.parse({
        ...APA7_TEMPLATE,
        page: {
          ...APA7_TEMPLATE.page,
          margin: { top: -1, right: 25.4, bottom: 25.4, left: 25.4 },
        },
      }),
    ).toThrow();
  });
});
