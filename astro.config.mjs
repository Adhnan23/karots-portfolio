// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Public pages are prerendered (static) by default; admin + API routes opt into
// SSR with `export const prerender = false`. The Cloudflare adapter serves those
// dynamic routes on Workers while static assets are served from the CDN.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://karots.lk",
  output: "static",
  // Inline page CSS into <head> so first paint isn't gated on a separate
  // render-blocking stylesheet request (our CSS is small).
  build: { inlineStylesheets: "always" },
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "compile",
  }),
  integrations: [
    // Exclude private/SSR routes from the public sitemap.
    sitemap({
      filter: (page) => !page.includes("/admin") && !page.includes("/resume"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
