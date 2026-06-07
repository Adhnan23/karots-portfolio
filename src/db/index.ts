import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { requireEnv, type AppEnv } from "@/lib/env";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Create a Drizzle client over Neon's HTTP driver. Works in Node (build/scripts)
 * and on Cloudflare Workers (SSR). Pass `locals.runtime.env` in SSR routes so the
 * Worker's bound DATABASE_URL is used; build-time callers can omit it.
 */
export function getDb(runtimeEnv?: AppEnv): DB {
  const url = requireEnv("DATABASE_URL", runtimeEnv);
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export { schema };
