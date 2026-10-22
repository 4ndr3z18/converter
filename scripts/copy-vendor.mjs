import { access, copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const vendorDir = path.join(root, "public", "vendor");

const files = [
  ["node_modules/pagedjs/dist/paged.polyfill.min.js", "paged/paged.polyfill.min.js"],
  ["node_modules/katex/dist/katex.min.css", "katex/katex.min.css"],
  ["node_modules/highlight.js/styles/github.min.css", "highlight/github.min.css"],
];

const families = [
  { name: "Tinos", pkg: "tinos", weights: [400, 700], styles: ["normal", "italic"] },
  { name: "Carlito", pkg: "carlito", weights: [400, 700], styles: ["normal", "italic"] },
  { name: "Arimo", pkg: "arimo", weights: [400, 700], styles: ["normal", "italic"] },
  { name: "Gelasio", pkg: "gelasio", weights: [400, 700], styles: ["normal", "italic"] },
  {
    name: "JetBrains Mono",
    pkg: "jetbrains-mono",
    weights: [400, 700],
    styles: ["normal"],
  },
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyFileIfExists(source, destination) {
  if (!(await exists(source))) return false;
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return true;
}

async function main() {
  let copied = 0;

  for (const [source, destination] of files) {
    const ok = await copyFileIfExists(
      path.join(root, source),
      path.join(vendorDir, destination),
    );
    if (ok) copied += 1;
    else console.warn(`[vendor] falta ${source}`);
  }

  const katexFonts = path.join(root, "node_modules", "katex", "dist", "fonts");
  if (await exists(katexFonts)) {
    await cp(katexFonts, path.join(vendorDir, "katex", "fonts"), {
      recursive: true,
    });
    copied += 1;
  }

  const fontCss = [];

  for (const family of families) {
    for (const weight of family.weights) {
      for (const style of family.styles) {
        const filename = `${family.pkg}-latin-${weight}-${style}.woff2`;
        const source = path.join(
          root,
          "node_modules",
          "@fontsource",
          family.pkg,
          "files",
          filename,
        );
        const destination = path.join(vendorDir, "fonts", filename);

        if (!(await copyFileIfExists(source, destination))) continue;

        fontCss.push(`@font-face {
  font-family: "${family.name}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: block;
  src: url("./${filename}") format("woff2");
}`);
        copied += 1;
      }
    }
  }

  await mkdir(path.join(vendorDir, "fonts"), { recursive: true });
  await writeFile(
    path.join(vendorDir, "fonts", "fonts.css"),
    `${fontCss.join("\n\n")}\n`,
    "utf8",
  );

  console.log(`[vendor] ${copied} archivos preparados en public/vendor`);
}

main().catch((error) => {
  console.error("[vendor] error:", error);
  process.exit(1);
});
