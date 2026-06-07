# karots-portfolio

Personal portfolio + admin CMS for **Mohammed Sheik Adhnan** (`karots.lk`).

- **Public site** — statically generated (Astro, prerendered), served from Cloudflare's CDN.
- **Admin CMS** — server-rendered on Cloudflare Workers, GitHub-OAuth protected, live CRUD into NeonDB.
- **Publish flow** — admin "Publish" button triggers a Cloudflare rebuild so static content goes live.

## Stack

Astro 5 · TypeScript · Tailwind CSS v4 · Drizzle ORM · NeonDB (Postgres) ·
Cloudflare Pages/Workers + R2 · Arctic (GitHub OAuth) · jose (sessions).

## Local development

```bash
bun install
cp .env.example .env            # fill DATABASE_URL + GitHub OAuth creds
cp .dev.vars.example .dev.vars  # mirror non-public values for wrangler
bun run db:push                 # apply schema to Neon
bun run db:seed                 # seed profile/projects/blog from source data
bun run dev                     # http://localhost:4321
```

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Astro dev server (with Cloudflare platformProxy) |
| `bun run build` | Static build + Worker bundle |
| `bun run preview` | Preview the built output via wrangler |
| `bun run db:push` | Push Drizzle schema to the database |
| `bun run db:migrate` | Run generated SQL migrations |
| `bun run db:studio` | Drizzle Studio (browse data) |
| `bun run db:seed` | Seed initial content |
| `bun run cv:pdf` | Generate the downloadable CV PDF |

## Environment

See `.env.example`. Secrets (`.env`, `.dev.vars`) are gitignored. In production
set these as Cloudflare project variables/secrets; bind the `R2` bucket and a
`SESSION` KV namespace in `wrangler.jsonc`.

## Project structure

```
src/
  components/   shared UI
  layouts/      page shells
  pages/        public routes + /admin (SSR) + /api (SSR)
  db/           Drizzle schema + connection
  lib/          env, auth, content helpers
  styles/       global.css (terminal-tech design system)
scripts/        seed + CV generation
```
