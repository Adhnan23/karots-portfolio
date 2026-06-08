import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// How a project is surfaced — drives which links/labels a card shows.
//  repo   = has a public GitHub repo
//  live   = primarily showcased via a live URL (may also have a repo)
//  client = private/client work, no public repo
//  infra  = DevOps/self-hosting showcase, no app repo
export const projectSourceEnum = pgEnum("project_source", [
  "repo",
  "live",
  "client",
  "infra",
]);

export const demoStatusEnum = pgEnum("demo_status", ["none", "planned", "live"]);

export const experienceTypeEnum = pgEnum("experience_type", ["work", "other"]);

/** Singleton profile row (id = 1). */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  title: text("title").notNull(),
  tagline: text("tagline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  location: text("location").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  /** [{ label, url, icon? }] */
  socials: jsonb("socials").$type<SocialLink[]>().notNull().default([]),
  avatarUrl: text("avatar_url"),
  resumeUrl: text("resume_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default(""),
  startDate: text("start_date").notNull(), // "Feb 2025"
  endDate: text("end_date"), // null = current
  description: text("description").notNull().default(""), // markdown
  type: experienceTypeEnum("type").notNull().default("work"),
  sort: integer("sort").notNull().default(0),
});

export const education = pgTable("education", {
  id: serial("id").primaryKey(),
  qualification: text("qualification").notNull(),
  institution: text("institution").notNull(),
  result: text("result").notNull().default(""),
  year: text("year").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  description: text("description").notNull().default(""), // markdown — overview / fallback
  // Case-study structure (all optional; the detail page falls back to `description`).
  problem: text("problem").notNull().default(""), // markdown
  approach: text("approach").notNull().default(""), // markdown
  outcome: text("outcome").notNull().default(""), // markdown
  /** [{ label, value }] impact metrics, e.g. { label: "p95 latency", value: "-40%" } */
  metrics: jsonb("metrics").$type<Metric[]>().notNull().default([]),
  architectureImageUrl: text("architecture_image_url"),
  tech: text("tech").array().notNull().default([]),
  role: text("role").notNull().default(""),
  category: text("category").notNull().default("app"),
  repoUrl: text("repo_url"),
  liveUrl: text("live_url"),
  source: projectSourceEnum("source").notNull().default("repo"),
  demoStatus: demoStatusEnum("demo_status").notNull().default("none"),
  featured: boolean("featured").notNull().default(false),
  coverImageUrl: text("cover_image_url"),
  /** [{ url, alt? }] */
  gallery: jsonb("gallery").$type<GalleryImage[]>().notNull().default([]),
  dateRange: text("date_range").notNull().default(""), // "2025"
  published: boolean("published").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""), // markdown
  coverImageUrl: text("cover_image_url"),
  tags: text("tags").array().notNull().default([]),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  readingTime: integer("reading_time").notNull().default(1), // minutes
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Services watched by the uptime board (curated via /admin/monitors). */
export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

/** Append-only healthcheck samples written by the pinger (scripts/healthcheck.ts). */
export const checks = pgTable("checks", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").notNull(),
  ok: boolean("ok").notNull(),
  statusCode: integer("status_code").notNull().default(0),
  responseMs: integer("response_ms").notNull().default(0),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Shared JSON shapes ---
export interface SocialLink {
  label: string;
  url: string;
  icon?: string;
}
export interface GalleryImage {
  url: string;
  alt?: string;
}
export interface Metric {
  label: string;
  value: string;
}

// --- Inferred row types ---
export type Profile = typeof profile.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof education.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type Monitor = typeof monitors.$inferSelect;
export type Check = typeof checks.$inferSelect;

export type NewProject = typeof projects.$inferInsert;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type NewMonitor = typeof monitors.$inferInsert;
