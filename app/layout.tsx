import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Converter — Markdown a PDF con plantillas HTML/CSS",
  description:
    "Creá plantillas HTML/CSS con Handlebars y convertí archivos Markdown en PDF. Incluye la plantilla APA 7 y procesa todo en tu equipo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
