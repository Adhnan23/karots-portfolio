/**
 * Generate a print-styled CV PDF from the built /resume page.
 *
 * Flow: serve the already-built ./dist statically → open it in headless
 * Chromium → print to PDF (Chromium applies the page's print CSS) →
 * write to ./public/cv.pdf so the next build ships it as a static asset.
 *
 * Usage: bun run build && bun run cv:pdf
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "../dist");
const OUT = resolve(HERE, "../public/cv.pdf");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

if (!existsSync(resolve(DIST, "resume/index.html"))) {
  console.error("✗ dist/resume/index.html not found. Run `bun run build` first.");
  process.exit(1);
}

// Resolve a request path to a file inside dist (supports clean URLs).
function resolveFile(pathname: string): string | null {
  const clean = decodeURIComponent(pathname.split("?")[0]);
  const candidates = [
    resolve(DIST, "." + clean),
    resolve(DIST, "." + clean, "index.html"),
    resolve(DIST, "." + clean + ".html"),
  ];
  for (const c of candidates) {
    if (c.startsWith(DIST) && existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

const server = createServer((req, res) => {
  const f = resolveFile(req.url ?? "/");
  if (!f) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  const ext = f.slice(f.lastIndexOf("."));
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  createReadStream(f).pipe(res);
});

await new Promise<void>((r) => server.listen(0, r));
const addr = server.address();
const port = typeof addr === "object" && addr ? addr.port : 0;
const base = `http://localhost:${port}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/resume`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true, // honor the page's @page { margin } rule
  });
  console.log("✓ CV written to public/cv.pdf");
} finally {
  await browser.close();
  server.close();
}
