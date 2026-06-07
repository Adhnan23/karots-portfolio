import { getDb } from "@/db";
import {
  profile,
  skills,
  experiences,
  education,
  projects,
  blogPosts,
  type Profile,
  type Skill,
} from "@/db/schema";
import type { AppEnv } from "@/lib/env";
import { eq, desc, asc, and } from "drizzle-orm";

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
