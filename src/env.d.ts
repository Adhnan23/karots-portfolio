/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Runtime bindings/secrets available on Cloudflare Workers (and via wrangler
// platformProxy in `astro dev`). Read these in SSR routes through
// `Astro.locals.runtime.env` / `context.locals.runtime.env`.
interface CloudflareEnv {
  DATABASE_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ALLOWED_GITHUB_LOGIN: string;
  GITHUB_DISPATCH_TOKEN?: string;
  /** Read-only token for build-time GitHub presence (pinned repos + contributions). */
  GITHUB_READ_TOKEN?: string;
  PUBLIC_SITE_URL?: string;
  UPLOADTHING_TOKEN?: string;
  R2_PUBLIC_URL?: string;
  R2?: R2Bucket;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {
    /** The authenticated admin session, set by middleware. */
    session: import("@/lib/auth/session").AdminSession | null;
  }
}

// Build-time / server env (import.meta.env) — non-public secrets are available
// server-side. Declared loosely; resolution is centralized in src/lib/env.ts.
interface ImportMetaEnv {
  readonly DATABASE_URL?: string;
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  readonly SESSION_SECRET?: string;
  readonly ALLOWED_GITHUB_LOGIN?: string;
  readonly GITHUB_DISPATCH_TOKEN?: string;
  readonly GITHUB_READ_TOKEN?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly UPLOADTHING_TOKEN?: string;
  readonly R2_PUBLIC_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
