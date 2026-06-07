// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// Public pages are prerendered (static) by default; admin + API routes opt into
// SSR with `export const prerender = false`. The Cloudflare adapter serves those
// dynamic routes on Workers while static assets are served from the CDN.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://karots.lk",
  output: "static",
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: "compile",
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
