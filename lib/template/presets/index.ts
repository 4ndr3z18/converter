import { APA7_TEMPLATE } from "@/lib/template/presets/apa7";
import type { TemplateDefinition } from "@/lib/template/schema";

/**
 * Registro de plantillas disponibles.
 *
 * En la Fase 1 este registro se sustituye por el repositorio SQLite sin
 * cambiar la interfaz que consume el render.
 */
const TEMPLATES: TemplateDefinition[] = [APA7_TEMPLATE];

export const DEFAULT_TEMPLATE_SLUG = APA7_TEMPLATE.slug;

export function listTemplates(): TemplateDefinition[] {
  return TEMPLATES;
}

export function getTemplate(slug: string): TemplateDefinition | null {
  return TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function resolveTemplate(slug?: string | null): TemplateDefinition {
  if (slug) {
    const found = getTemplate(slug);
    if (found) return found;
  }
  return APA7_TEMPLATE;
}
