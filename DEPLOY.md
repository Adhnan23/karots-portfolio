# Deploying karots.lk

This is an Astro site with a **static public site** + **SSR admin/API** on Cloudflare,
backed by **Neon** (Postgres) and **Cloudflare R2** (image uploads). Edits in the admin
panel are saved to Neon immediately; the public site is rebuilt on demand via the
**Publish** button (a Cloudflare deploy hook).

## 1. Prerequisites (one-time accounts)

- **Neon** project (Postgres) — you already have one.
- **Cloudflare** account (Pages + R2).
- **GitHub OAuth App** for admin login.

## 2. Environment variables

Set these as **Cloudflare Pages → Settings → Environment variables** (Production),
and locally in `.dev.vars` (gitignored). `.env`/`.env.example` document them too.

| Variable | What | Where to get it |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Neon dashboard → Connection string |
| `GITHUB_CLIENT_ID` | OAuth app client id | GitHub OAuth App (step 3) |
| `GITHUB_CLIENT_SECRET` | OAuth app secret | GitHub OAuth App (step 3) |
| `ALLOWED_GITHUB_LOGIN` | Only this GitHub login may sign in | `Adhnan23` |
| `SESSION_SECRET` | Signs session JWTs | `openssl rand -hex 32` |
| `PUBLIC_SITE_URL` | Canonical site origin | `https://karots.lk` |
| `CF_DEPLOY_HOOK_URL` | Triggers a rebuild on Publish | Cloudflare Pages deploy hook (step 5) |
| `UPLOADTHING_TOKEN` | Admin image uploads (preferred) | uploadthing.com dashboard → API Keys |
| `R2_PUBLIC_URL` | Optional R2 fallback for uploads | R2 bucket public domain (step 6) |

> `SESSION_SECRET`, `GITHUB_CLIENT_SECRET`, `DATABASE_URL`, and `CF_DEPLOY_HOOK_URL`
> are **secrets** — never commit them. They already live only in gitignored files.

## 3. GitHub OAuth App

1. GitHub → Settings → Developer settings → **OAuth Apps** → New.
2. **Homepage URL**: `https://karots.lk`
3. **Authorization callback URL**: `https://karots.lk/api/auth/github/callback`
   - For local dev add a second app (or update) with `http://localhost:4321/api/auth/github/callback`.
4. Copy the **Client ID** and generate a **Client secret** → set the env vars above.

## 4. Database

The schema is managed with Drizzle. Against the production Neon DB:

```bash
bun run db:migrate     # applies drizzle/*.sql
bun run db:seed        # optional: load initial content (already done once)
```

## 5. Cloudflare Pages

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → this repo.
2. Build settings:
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
   - **Compatibility flags**: `nodejs_compat` (already in `wrangler.jsonc`).
3. Add all environment variables from step 2.
4. After the first deploy, create a **Deploy hook**
   (Settings → Builds & deployments → Deploy hooks) and set its URL as
   `CF_DEPLOY_HOOK_URL`. The admin **Publish** button POSTs to it.

## 6. Image uploads

**Preferred — UploadThing:** set `UPLOADTHING_TOKEN` (from the uploadthing.com
dashboard) as a Pages **secret**. The admin upload route uses it directly; no
Cloudflare R2 needed. This is what production currently uses.

**Optional R2 fallback:** if you'd rather use R2, enable R2 in the Cloudflare
dashboard, then:

```bash
wrangler r2 bucket create karots-portfolio-media
```

Re-enable the `r2_buckets` binding in `wrangler.jsonc`, enable a **public URL** for
the bucket, and set `R2_PUBLIC_URL`. The upload route prefers UploadThing when its
token is set, and falls back to R2 otherwise. With neither configured, upload returns
a graceful 501 and you can paste image URLs manually.

## 7. Custom domain

Cloudflare Pages → Custom domains → add `karots.lk` (and `www` redirect if desired).
Make sure `PUBLIC_SITE_URL` matches the final origin so canonical URLs, the sitemap,
and OG tags are correct.

## 8. Sessions binding (optional)

Auth is **stateless** (signed JWT cookie via `jose`), so no KV session store is
required. If Astro logs a note about a `SESSION` KV binding, it is safe to ignore;
to silence it, create a KV namespace and bind it as `SESSION` in `wrangler.jsonc`.

## Regenerating generated assets

These are committed into `public/` and shipped by the build:

```bash
bun run build && bun run cv:pdf   # public/cv.pdf from the /resume page
bun run og:image                  # public/og.png social share card
```

## SEO checklist (already wired)

- Per-page `<title>`, description, keywords, canonical, robots.
- Open Graph + Twitter cards with a generated `og.png` (1200×630).
- JSON-LD: `Person` + `WebSite` site-wide, `BlogPosting` on posts,
  `SoftwareSourceCode`/`CreativeWork` + `BreadcrumbList` on projects.
- `sitemap-index.xml` (admin/resume excluded), `robots.txt`, RSS at `/rss.xml`.
- After deploy: submit the sitemap in Google Search Console and validate a couple of
  pages with the Rich Results Test.
