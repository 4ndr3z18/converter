import { TemplateEditor } from "@/components/template-editor";

// El editor es una ruta dinámica que lee params en cada solicitud.
export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TemplateEditorPage({ params }: PageProps) {
  const { id } = await params;
  return <TemplateEditor id={id} />;
}
