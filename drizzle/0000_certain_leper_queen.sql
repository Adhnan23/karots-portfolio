CREATE TYPE "public"."demo_status" AS ENUM('none', 'planned', 'live');--> statement-breakpoint
CREATE TYPE "public"."experience_type" AS ENUM('work', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_source" AS ENUM('repo', 'live', 'client', 'infra');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"reading_time" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"qualification" text NOT NULL,
	"institution" text NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"company" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"description" text DEFAULT '' NOT NULL,
	"type" "experience_type" DEFAULT 'work' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"socials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avatar_url" text,
	"resume_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tech" text[] DEFAULT '{}' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'app' NOT NULL,
	"repo_url" text,
	"live_url" text,
	"source" "project_source" DEFAULT 'repo' NOT NULL,
	"demo_status" "demo_status" DEFAULT 'none' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"cover_image_url" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_range" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
