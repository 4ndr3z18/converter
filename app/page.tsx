import { readFileSync } from "node:fs";
import path from "node:path";
import { Lab } from "@/components/lab";
import { APA7_TEMPLATE } from "@/lib/template/presets/apa7";

const fixture = readFileSync(
  path.join(process.cwd(), "fixtures", "apa-demo.md"),
  "utf8",
);

export default function Home() {
  return (
    <Lab
      initialMarkdown={fixture}
      templateName={APA7_TEMPLATE.name}
      templateSlug={APA7_TEMPLATE.slug}
    />
  );
}
