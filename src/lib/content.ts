import { getDb } from "@/db";
import {
  profile,
  skills,
  experiences,
  education,
  projects,
  blogPosts,
  contactMessages,
  monitors,
  checks,
  type Profile,
  type Skill,
} from "@/db/schema";
import type { AppEnv } from "@/lib/env";
import { eq, desc, asc, and, gte } from "drizzle-orm";

/**
 * Content access layer. Public (static) pages call these at build time with no
 * args; SSR/admin routes pass `locals.runtime.env` so the Worker's DATABASE_URL
 * binding is used.
 */

export async function getProfile(env?: AppEnv): Promise<Profile | null> {
  const db = getDb(env);
  const [row] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  return row ?? null;
}

export interface SkillGroup {
  category: string;
  items: Skill[];
}

export async function getSkillsGrouped(env?: AppEnv): Promise<SkillGroup[]> {
  const db = getDb(env);
  const rows = await db.select().from(skills).orderBy(asc(skills.sort));
  const map = new Map<string, Skill[]>();
  for (const s of rows) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }));
}

export async function getExperiences(env?: AppEnv) {
  const db = getDb(env);
  return db.select().from(experiences).orderBy(asc(experiences.sort));
}

export async function getEducation(env?: AppEnv) {
  const db = getDb(env);
  return db.select().from(education).orderBy(asc(education.sort));
}

export async function getProjects(
  opts: { featuredOnly?: boolean; includeUnpublished?: boolean } = {},
  env?: AppEnv
) {
  const db = getDb(env);
  const conds = [];
  if (!opts.includeUnpublished) conds.push(eq(projects.published, true));
  if (opts.featuredOnly) conds.push(eq(projects.featured, true));
  const where = conds.length ? and(...conds) : undefined;
  return db.select().from(projects).where(where).orderBy(asc(projects.sort));
}

export async function getProjectBySlug(slug: string, env?: AppEnv) {
  const db = getDb(env);
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return row ?? null;
}

export async function getBlogPosts(
  opts: { includeUnpublished?: boolean } = {},
  env?: AppEnv
) {
  const db = getDb(env);
  const where = opts.includeUnpublished ? undefined : eq(blogPosts.published, true);
  return db.select().from(blogPosts).where(where).orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPostBySlug(slug: string, env?: AppEnv) {
  const db = getDb(env);
  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return row ?? null;
}

export interface SparkPoint {
  ok: boolean;
  responseMs: number;
  checkedAt: Date;
}
export interface MonitorStatus {
  name: string;
  slug: string;
  url: string;
  up: boolean | null; // null = no checks yet
  lastCheckedAt: Date | null;
  uptime24h: number | null; // percent 0–100, null if no samples in window
  uptime30d: number | null;
  uptime90d: number | null;
  avgMs: number | null; // avg latency of successful checks (last 30d)
  spark: SparkPoint[]; // most-recent-last, up to 30 points
}
export interface StatusBoard {
  monitors: MonitorStatus[];
  allOperational: boolean;
  generatedAt: Date;
}

/**
 * Aggregate the uptime board from raw `checks`. Pure JS aggregation over the
 * last 90 days of samples. Used by the SSR /status page (live data).
 */
export async function getStatusBoard(env?: AppEnv): Promise<StatusBoard> {
  const db = getDb(env);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const since90 = new Date(now - 90 * day);

  const [mons, rows] = await Promise.all([
    db.select().from(monitors).where(eq(monitors.enabled, true)).orderBy(asc(monitors.sort)),
    db.select().from(checks).where(gte(checks.checkedAt, since90)).orderBy(asc(checks.checkedAt)),
  ]);

  const byMonitor = new Map<number, typeof rows>();
  for (const r of rows) {
    const arr = byMonitor.get(r.monitorId) ?? [];
    arr.push(r);
    byMonitor.set(r.monitorId, arr);
  }

  const uptimePct = (samples: typeof rows, windowMs: number): number | null => {
    const from = now - windowMs;
    const inWin = samples.filter((s) => s.checkedAt.getTime() >= from);
    if (inWin.length === 0) return null;
    const up = inWin.filter((s) => s.ok).length;
    return Math.round((up / inWin.length) * 1000) / 10; // 1 decimal
  };

  const result: MonitorStatus[] = mons.map((m) => {
    const samples = byMonitor.get(m.id) ?? [];
    const last = samples[samples.length - 1] ?? null;
    const okLast30 = samples.filter((s) => s.ok && s.checkedAt.getTime() >= now - 30 * day);
    const avgMs =
      okLast30.length > 0
        ? Math.round(okLast30.reduce((a, s) => a + s.responseMs, 0) / okLast30.length)
        : null;
    return {
      name: m.name,
      slug: m.slug,
      url: m.url,
      up: last ? last.ok : null,
      lastCheckedAt: last ? last.checkedAt : null,
      uptime24h: uptimePct(samples, day),
      uptime30d: uptimePct(samples, 30 * day),
      uptime90d: uptimePct(samples, 90 * day),
      avgMs,
      spark: samples.slice(-30).map((s) => ({ ok: s.ok, responseMs: s.responseMs, checkedAt: s.checkedAt })),
    };
  });

  return {
    monitors: result,
    allOperational: result.length > 0 && result.every((m) => m.up === true),
    generatedAt: new Date(),
  };
}

export interface AdminStats {
  projects: number;
  projectsPublished: number;
  posts: number;
  postsPublished: number;
  messages: number;
  messagesUnread: number;
}

export async function getAdminStats(env?: AppEnv): Promise<AdminStats> {
  const db = getDb(env);
  const [proj, post, msg] = await Promise.all([
    db.select().from(projects),
    db.select().from(blogPosts),
    db.select().from(contactMessages),
  ]);
  return {
    projects: proj.length,
    projectsPublished: proj.filter((p) => p.published).length,
    posts: post.length,
    postsPublished: post.filter((p) => p.published).length,
    messages: msg.length,
    messagesUnread: msg.filter((m) => !m.read).length,
  };
}
