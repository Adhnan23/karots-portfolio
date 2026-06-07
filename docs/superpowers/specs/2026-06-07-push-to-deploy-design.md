# Push-to-deploy self-service — design

**Date:** 2026-06-07
**Status:** Approved (design)

## Problem

The admin **Publish** button POSTs to `CF_DEPLOY_HOOK_URL`, but the live Pages
project `karotsportfolio` is a **direct-upload** project. Cloudflare deploy hooks
only exist on **Git-connected** projects, and a project cannot be converted between
the two types. So the Publish button currently does nothing useful.

The public site is statically generated from Neon at build time, so any rebuild
needs `DATABASE_URL` available at build time.

## Chosen approach

**GitHub Actions builds and deploys; the Publish button triggers the workflow.**

Keep the existing live `karotsportfolio` direct-upload project untouched (no domain
cutover). A GitHub Actions workflow builds the site and runs `wrangler pages deploy`.
The workflow runs on every push to `main` **and** on manual `workflow_dispatch`. The
admin Publish button calls GitHub's `workflow_dispatch` API to trigger the same
pipeline.

This delivers true CI/CD (push to deploy) and a working Publish button, while
avoiding a second domain cutover.

Rejected alternative: create a new Git-connected Pages project and move the
`karots.lk` / `www` domains onto it. Rejected because it repeats the risky domain
cutover we just completed and requires a manual dashboard GitHub-OAuth step.

## Flow

```
git push main ─┐
               ├─► GitHub Actions (deploy.yml) ─► bun install ─► astro build
Admin "Publish"┘        (DATABASE_URL from GH secret)     │
   POST /api/admin/publish                                 ▼
   → GitHub workflow_dispatch API          wrangler pages deploy dist
   (Bearer GITHUB_DISPATCH_TOKEN)            --project-name=karotsportfolio
                                                  │
                                                  ▼  (existing project, same
                                            karots.lk / www domains — no cutover)
```

## Components

### 1. `.github/workflows/deploy.yml` (new)

- **Triggers:** `push` to `main`; `workflow_dispatch`.
- **Concurrency:** group `deploy-main`, `cancel-in-progress: true` (a newer build
  supersedes an in-flight one).
- **Steps:**
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2`
  3. `bun install --frozen-lockfile`
  4. Build: `bun run build` with env `PUBLIC_SITE_URL=https://karots.lk` and
     `DATABASE_URL` from `secrets.DATABASE_URL`.
  5. Deploy: `cloudflare/wrangler-action@v3` with `apiToken` =
     `secrets.CLOUDFLARE_API_TOKEN`, `accountId` = `secrets.CLOUDFLARE_ACCOUNT_ID`,
     `command: pages deploy dist --project-name=karotsportfolio --branch=main`.
     Pin wrangler to the 4.x line.
- **Preserved config:** `wrangler pages deploy` keeps existing `secret_text` runtime
  secrets (DATABASE_URL, GITHUB_CLIENT_SECRET, SESSION_SECRET, UPLOADTHING_TOKEN) and
  applies plain-text `vars` from `wrangler.jsonc`. No runtime config is lost.
- CI does **not** run `cv:pdf` / `og:image` (needs Chromium); the committed
  `public/cv.pdf` and `public/og.png` ship as-is.

### 2. `src/pages/api/admin/publish.ts` (edit)

Replace the CF-hook POST with a GitHub `workflow_dispatch` call:

- Endpoint: `POST https://api.github.com/repos/Adhnan23/karots-portfolio/actions/workflows/deploy.yml/dispatches`
- Body: `{"ref":"main"}`
- Headers: `Authorization: Bearer ${GITHUB_DISPATCH_TOKEN}`,
  `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`,
  `User-Agent: karots-admin`.
- Success = HTTP `204`. Map missing token → `unconfigured`; non-204 → `failed`;
  thrown error → generic failure (reuse existing `redirectBack` / `failed` helpers).
- Repo owner/name and workflow file are code constants; only the token is secret.

### 3. `src/pages/admin/publish.astro` (edit)

`configured` keys off `GITHUB_DISPATCH_TOKEN` instead of `CF_DEPLOY_HOOK_URL`. Update
the "not configured" help text and the success/error copy to reflect GitHub Actions.

### 4. `src/env.d.ts` (edit)

Add `GITHUB_DISPATCH_TOKEN?: string` to `CloudflareEnv` and `ImportMetaEnv`.

### 5. `DEPLOY.md` (edit)

Rewrite the Publish / deploy-hook section to describe the GitHub Actions pipeline and
the four secrets below.

## Secrets

| Secret | Lives in | Source |
|---|---|---|
| `DATABASE_URL` | GitHub repo secret | Existing value in local `.env` |
| `CLOUDFLARE_API_TOKEN` | GitHub repo secret | **User creates** — CF token, *Account → Cloudflare Pages → Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub repo secret | Known: `a486bb41a30df886d13e0f6881632f18` |
| `GITHUB_DISPATCH_TOKEN` | Cloudflare Pages secret + local `.dev.vars` | **User creates** — fine-grained PAT on `karots-portfolio`, *Actions: Read & write* |

No new secret is committed; `.env` / `.dev.vars` stay gitignored.

## Division of labor

- **Claude:** write `deploy.yml`, edit `publish.ts` / `publish.astro` / `env.d.ts` /
  `DEPLOY.md`; commit and push; set the Cloudflare Pages `GITHUB_DISPATCH_TOKEN`
  secret via the cloudflare-api MCP once the user supplies the PAT.
- **User:** create the Cloudflare API token and the GitHub PAT; add the three GitHub
  repo secrets in the GitHub UI (exact paths provided).

## Verification

1. Pushing the workflow commit to `main` triggers a run that builds and deploys; the
   run is green and a new deployment appears on `karotsportfolio`.
2. `karots.lk` still serves correctly (no domain change; runtime secrets intact —
   admin login still works).
3. Editing content in admin then clicking **Publish** returns success and triggers a
   fresh workflow run; the change appears on the public site within ~1–2 minutes.
4. Local `bun run dev` Publish button works once `GITHUB_DISPATCH_TOKEN` is in
   `.dev.vars`.

## Out of scope

- Regenerating `cv.pdf` / `og.png` in CI (kept manual; committed outputs ship).
- Rotating the previously-shared secrets (tracked separately).
