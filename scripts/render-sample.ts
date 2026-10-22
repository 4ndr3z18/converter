import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const port = Number(process.env.PORT ?? 3100);
const baseUrl = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;
const shouldStart = process.argv.includes("--start");

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // el servidor todavía no escucha
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`El servidor no respondió en ${url}`);
}

function startServer(): ChildProcess {
  const nextBin = path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  return child;
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/T", "/F"],
        { stdio: "ignore" },
      );
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  child.kill("SIGTERM");
}

async function main(): Promise<void> {
  const server = shouldStart ? startServer() : null;

  try {
    await waitForServer(`${baseUrl}/api/health`);

    const markdown = await readFile(
      path.join(process.cwd(), "fixtures", "apa-demo.md"),
      "utf8",
    );

    const response = await fetch(`${baseUrl}/api/pdf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown, template: "apa7-informe" }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`La API respondió ${response.status}: ${detail}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const outputDir = path.join(process.cwd(), "artifacts");
    await mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, "demo-apa.pdf");
    await writeFile(outputPath, bytes);

    const parser = new PDFParse({ data: bytes });
    const textResult = await parser.getText();
    const info = await parser.getInfo();
    await parser.destroy();

    const pageCount = info.total || textResult.total;
    const text = textResult.text;

    const required = [
      "Resumen",
      "Palabras clave",
      "Introducción",
      "Marco teórico",
      "Metodología",
      "Resultados",
      "Discusión",
      "Conclusiones",
      "Referencias",
      "Anexos",
      "Tabla 1",
      "Figura 1",
      "Universidad Nacional de Ejemplo",
      "Pérez Quispe, Ana Lucía",
    ];

    const missing = required.filter((needle) => !text.includes(needle));

    console.log(`PDF generado: ${outputPath}`);
    console.log(`Páginas: ${pageCount}`);
    console.log(`Caracteres extraídos: ${text.length}`);

    if (missing.length > 0) {
      console.error(`Faltan textos esperados: ${missing.join(", ")}`);
      process.exitCode = 1;
    }

    if (pageCount < 6) {
      console.error("El PDF tiene menos páginas de las esperadas.");
      process.exitCode = 1;
    }

    if (!process.exitCode) {
      console.log("Verificación de contenido: OK");
    }
  } finally {
    if (server) await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
