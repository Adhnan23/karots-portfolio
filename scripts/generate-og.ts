/**
 * Generate the social share image (public/og.png, 1200x630) from an inline
 * HTML template in the site's amber-CRT theme. Run: bun run og:image
 */
import { chromium } from "playwright-core";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../public/og.png");

const NAME = "Mohammed Sheik Adhnan";
const ROLE = "Backend & DevOps Engineer";
const TAGLINE = "Self-hosted production infra · Node.js · Go · Cloudflare";
const DOMAIN = "karots.lk";

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #0b0b0d; color: #f5f5f4; position: relative;
    font-family: 'Bricolage Grotesque', sans-serif;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .glow { position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 60% at 18% 0%, rgba(242,165,22,0.14), transparent 60%); }
  .frame { position: absolute; inset: 0; padding: 76px 84px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; gap: 14px; font-family: 'JetBrains Mono', monospace;
    font-size: 22px; color: #f2a516; letter-spacing: 0.05em; }
  .dot { width: 11px; height: 11px; border-radius: 999px; background: #4ade80;
    box-shadow: 0 0 12px #4ade80; }
  .mid { margin-top: auto; }
  h1 { font-size: 96px; font-weight: 800; line-height: 0.98; letter-spacing: -0.02em; }
  .role { margin-top: 22px; font-size: 40px; font-weight: 700; color: #f2a516; }
  .tag { margin-top: 26px; font-family: 'JetBrains Mono', monospace; font-size: 24px; color: #a8a29e; }
  .bottom { margin-top: 40px; display: flex; justify-content: space-between; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 24px; color: #78716c; }
  .url { color: #f5f5f4; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="frame">
    <div class="top"><span class="dot"></span><span>~/portfolio — engineering log</span></div>
    <div class="mid">
      <h1>${NAME}</h1>
      <div class="role">${ROLE}</div>
      <div class="tag">${TAGLINE}</div>
    </div>
    <div class="bottom"><span>$ whoami</span><span class="url">${DOMAIN}</span></div>
  </div>
</body></html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({ path: OUT, type: "png" });
  console.log("✓ OG image written to public/og.png");
} finally {
  await browser.close();
}
