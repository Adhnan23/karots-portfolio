/**
 * Centralized env resolution.
 *
 * Values can arrive from two places depending on context:
 *  - Build time / Node (static page data fetching, scripts): process.env / import.meta.env
 *  - Cloudflare Worker runtime (SSR admin + API routes): Astro.locals.runtime.env
 *
 * Pass the runtime env when available (SSR); otherwise we fall back to the
 * build/Node env. This keeps `getDb()` and auth helpers usable in both worlds.
 */
export type AppEnv = Partial<CloudflareEnv> & Record<string, unknown>;

function fromBuildEnv(): AppEnv {
  // import.meta.env is replaced at build; process.env covers script/runtime Node.
  const meta = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const proc = typeof process !== "undefined" ? process.env : {};
  return { ...meta, ...proc } as AppEnv;
}

export function resolveEnv(runtimeEnv?: AppEnv): AppEnv {
  return { ...fromBuildEnv(), ...(runtimeEnv ?? {}) };
}

export function requireEnv(key: keyof CloudflareEnv, runtimeEnv?: AppEnv): string {
  const v = resolveEnv(runtimeEnv)[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing required env var: ${String(key)}`);
  }
  return v;
}
