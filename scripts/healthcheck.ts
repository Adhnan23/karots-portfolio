/**
 * Healthcheck pinger for the status board. Reads enabled monitors, pings each,
 * and appends a sample to `checks`. Prunes samples older than 90 days to bound
 * table growth. Idempotent and safe to run repeatedly.
 *
 * Scheduled via .github/workflows/healthcheck.yml; run locally with:
 *   bun run healthcheck
 */
import { getDb, schema } from "../src/db";
import { eq, lt } from "drizzle-orm";

const TIMEOUT_MS = 10_000;
const RETAIN_DAYS = 90;

async function ping(url: string): Promise<{ ok: boolean; statusCode: number; responseMs: number }> {
  const started = Date.now();
  try {
    // HEAD first (cheap); fall back to GET for servers that reject HEAD.
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "karots-status/1.0" },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "karots-status/1.0" },
      });
    }
    return { ok: res.status < 400, statusCode: res.status, responseMs: Date.now() - started };
  } catch {
    return { ok: false, statusCode: 0, responseMs: Date.now() - started };
  }
}

async function main() {
  const db = getDb();
  const monitors = await db.select().from(schema.monitors).where(eq(schema.monitors.enabled, true));
  if (monitors.length === 0) {
    console.log("No enabled monitors — nothing to check.");
    return;
  }

  const results = await Promise.all(
    monitors.map(async (m) => {
      const r = await ping(m.url);
      return { monitorId: m.id, name: m.name, ...r };
    })
  );

  await db.insert(schema.checks).values(
    results.map((r) => ({
      monitorId: r.monitorId,
      ok: r.ok,
      statusCode: r.statusCode,
      responseMs: r.responseMs,
    }))
  );

  // Prune old samples.
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(schema.checks).where(lt(schema.checks.checkedAt, cutoff));

  for (const r of results) {
    console.log(`${r.ok ? "✓ up  " : "✗ DOWN"} ${r.name} — ${r.statusCode} in ${r.responseMs}ms`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Healthcheck failed:", err);
    process.exit(1);
  });
