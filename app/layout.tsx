import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Converter — Informes en PDF desde Markdown",
  description:
    "Convierte archivos Markdown en informes PDF con plantillas editables. Plantilla APA 7 incluida.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
