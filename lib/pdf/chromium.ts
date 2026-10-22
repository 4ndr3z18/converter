import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

/**
 * Serializa las exportaciones: un solo Chromium a la vez evita picos de
 * memoria cuando se generan varios PDF en paralelo.
 */
export function renderPdf(url: string): Promise<Buffer> {
  const run = queue.then(() => renderPdfInner(url));
  queue = run.catch(() => undefined);
  return run;
}

async function renderPdfInner(url: string): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();

    page.on("pageerror", (error) => {
      console.error("[pdf] error en la página de impresión:", error);
    });

    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));

    await page.waitForFunction(
      () =>
        (window as unknown as { __PAGED_READY__?: boolean }).__PAGED_READY__ ===
        true,
      undefined,
      { timeout: 60_000 },
    );

    const pagedError = await page.evaluate(
      () =>
        (window as unknown as { __PAGED_ERROR__?: string }).__PAGED_ERROR__ ??
        null,
    );

    if (pagedError) {
      throw new Error(`No se pudo paginar el documento: ${pagedError}`);
    }

    await page.waitForFunction(
      () => document.querySelectorAll(".pagedjs_page").length > 0,
      undefined,
      { timeout: 15_000 },
    );

    const pageSize = await page.evaluate(() => {
      const element = document.querySelector(".pagedjs_page");
      if (!element) return null;

      const style = getComputedStyle(element);
      const width = style.getPropertyValue("--pagedjs-pagebox-width").trim();
      const height = style.getPropertyValue("--pagedjs-pagebox-height").trim();

      return width && height ? { width, height } : null;
    });

    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);

    // Playwright redondea los milímetros a píxeles y añade ~1pt al MediaBox.
    // Convertir a pulgadas mantiene el tamaño exacto (Letter = 612 × 792 pt).
    const toInches = (value: string): string => {
      const match = /^([\d.]+)mm$/.exec(value);
      return match ? `${(Number(match[1]) / 25.4).toFixed(4)}in` : value;
    };

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      width: pageSize ? toInches(pageSize.width) : undefined,
      height: pageSize ? toInches(pageSize.height) : undefined,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close().catch(() => undefined);
}
