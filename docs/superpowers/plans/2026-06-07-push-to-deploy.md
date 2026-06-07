# Push-to-deploy Self-Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin **Publish** button (and every `git push` to `main`) rebuild and redeploy the static site, by running the build in GitHub Actions and deploying with `wrangler pages deploy` to the existing `karotsportfolio` project.

**Architecture:** A GitHub Actions workflow builds the Astro site (fetching content from Neon with `DATABASE_URL`) and deploys `dist/` to the live direct-upload Pages project. It runs on push to `main` and on `workflow_dispatch`. The admin Publish endpoint triggers the workflow via the GitHub `workflow_dispatch` API using a PAT stored as a Cloudflare Pages secret. No new Pages project and no domain cutover.

**Tech Stack:** GitHub Actions, `oven-sh/setup-bun`, `cloudflare/wrangler-action@v3`, Astro 5 SSR route, Cloudflare Pages.

---

## File Structure

- **Create** `.github/workflows/deploy.yml` — CI: build + deploy on push/dispatch.
- **Modify** `src/env.d.ts` — swap `CF_DEPLOY_HOOK_URL` for `GITHUB_DISPATCH_TOKEN`.
- **Modify** `src/pages/api/admin/publish.ts` — trigger workflow_dispatch instead of CF hook.
- **Modify** `src/pages/admin/publish.astro` — copy + `configured` keyed off the new token.
- **Modify** `DEPLOY.md` — document the GitHub Actions pipeline + secrets.

Note: tasks 1–5 commit locally but **do not push**. The first push happens only in Task 8, after the GitHub secrets exist, so the first workflow run is green.

---

### Task 1: Add the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow file**

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-main
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build
        env:
          PUBLIC_SITE_URL: https://karots.lk
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          wranglerVersion: "4"
          command: pages deploy dist --project-name=karotsportfolio --branch=main
```

- [ ] **Step 2: Validate the YAML parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit (do not push yet)**

```bash
git add .github/workflows/deploy.yml
git -c user.name="Sheik Adhnan" -c user.email="adhnanmsa@gmail.com" commit -m "CI: GitHub Actions build + deploy to Cloudflare Pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Update env types for the dispatch token

**Files:**
- Modify: `src/env.d.ts`

- [ ] **Step 1: Replace `CF_DEPLOY_HOOK_URL` in the `CloudflareEnv` interface**

Find:
```ts
  CF_DEPLOY_HOOK_URL?: string;
```
Replace with:
```ts
  GITHUB_DISPATCH_TOKEN?: string;
```

- [ ] **Step 2: Replace `CF_DEPLOY_HOOK_URL` in the `ImportMetaEnv` interface**

Find:
```ts
  readonly CF_DEPLOY_HOOK_URL?: string;
```
Replace with:
```ts
  readonly GITHUB_DISPATCH_TOKEN?: string;
```

- [ ] **Step 3: Commit (do not push yet)**

```bash
git add src/env.d.ts
git -c user.name="Sheik Adhnan" -c user.email="adhnanmsa@gmail.com" commit -m "Env: replace CF_DEPLOY_HOOK_URL with GITHUB_DISPATCH_TOKEN

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Rewrite the publish API route to trigger the workflow

**Files:**
- Modify: `src/pages/api/admin/publish.ts` (full replace)

- [ ] **Step 1: Replace the file contents**

```ts
import type { APIRoute } from "astro";
import { resolveEnv, envFromLocals } from "@/lib/env";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/publish";

/**
 * Publishing rebuilds the static public site. The build runs in GitHub Actions
 * (.github/workflows/deploy.yml): `astro build` against Neon, then
 * `wrangler pages deploy` to the karotsportfolio project. This route triggers
 * that workflow via the GitHub workflow_dispatch API. The PAT is a secret and is
 * never exposed to the browser.
 */
const REPO = "Adhnan23/karots-portfolio";
const WORKFLOW = "deploy.yml";

export const POST: APIRoute = async ({ locals }) => {
  const env = resolveEnv(envFromLocals(locals));
  const token = env.GITHUB_DISPATCH_TOKEN;

  if (typeof token !== "string" || token.length === 0) {
    return redirectBack(PAGE, { error: "unconfigured" });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "karots-admin",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (res.status !== 204) {
      console.error(
        "workflow dispatch failed",
        res.status,
        await res.text().catch(() => ""),
      );
      return redirectBack(PAGE, { error: "failed" });
    }
    return redirectBack(PAGE, { published: "1" });
  } catch (err) {
    console.error("workflow dispatch request error", err);
    return failed(PAGE);
  }
};
```

- [ ] **Step 2: Verify the build compiles the route**

Run: `bun run build`
Expected: build completes with no error (publish.ts compiles; no references to `CF_DEPLOY_HOOK_URL` remain).

- [ ] **Step 3: Commit (do not push yet)**

```bash
git add src/pages/api/admin/publish.ts
git -c user.name="Sheik Adhnan" -c user.email="adhnanmsa@gmail.com" commit -m "Publish: trigger GitHub Actions workflow_dispatch instead of CF hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Update the Publish admin page copy

**Files:**
- Modify: `src/pages/admin/publish.astro`

- [ ] **Step 1: Update the `configured` check**

Find:
```ts
const configured = typeof env.CF_DEPLOY_HOOK_URL === "string" && env.CF_DEPLOY_HOOK_URL.length > 0;
```
Replace with:
```ts
const configured = typeof env.GITHUB_DISPATCH_TOKEN === "string" && env.GITHUB_DISPATCH_TOKEN.length > 0;
```

- [ ] **Step 2: Update the error text map**

Find:
```ts
const ERROR_TEXT: Record<string, string> = {
  unconfigured: "No deploy hook is configured. Set CF_DEPLOY_HOOK_URL to enable publishing.",
  failed: "Cloudflare rejected the build request. Check the deploy hook URL.",
  "1": "Something went wrong reaching Cloudflare. Try again.",
};
```
Replace with:
```ts
const ERROR_TEXT: Record<string, string> = {
  unconfigured: "Publishing isn't configured. Set GITHUB_DISPATCH_TOKEN to enable it.",
  failed: "GitHub rejected the deploy trigger. Check the GITHUB_DISPATCH_TOKEN scope.",
  "1": "Something went wrong reaching GitHub. Try again.",
};
```

- [ ] **Step 3: Update the success banner copy**

Find:
```
        ✓ Build triggered. The public site will refresh in ~1–2 minutes.
```
Replace with:
```
        ✓ Deploy triggered. The public site will refresh in ~1–2 minutes.
```

- [ ] **Step 4: Update the "Deploy hook" card label**

Find:
```
          <div class="mono-label">Deploy hook</div>
```
Replace with:
```
          <div class="mono-label">Auto-deploy</div>
```

- [ ] **Step 5: Update the "not configured" help text**

Find:
```
          <p class="mt-4 border-t border-border pt-4 font-mono text-xs leading-relaxed text-fg-subtle">
            To enable: create a <span class="text-accent">Deploy hook</span> in your
            Cloudflare Pages project (Settings → Builds &amp; deployments), then set
            <span class="text-accent"> CF_DEPLOY_HOOK_URL</span> as a secret in Cloudflare
            and in <span class="text-accent">.dev.vars</span> locally.
          </p>
```
Replace with:
```
          <p class="mt-4 border-t border-border pt-4 font-mono text-xs leading-relaxed text-fg-subtle">
            To enable: create a fine-grained <span class="text-accent">GitHub PAT</span>
            on <span class="text-accent">karots-portfolio</span> with
            <span class="text-accent"> Actions: Read &amp; write</span>, then set it as
            <span class="text-accent"> GITHUB_DISPATCH_TOKEN</span> (Cloudflare Pages secret
            and <span class="text-accent">.dev.vars</span> locally).
          </p>
```

- [ ] **Step 6: Update the tip text**

Find:
```
      <span class="text-accent">tip:</span> batch your edits, then publish once. Each
      publish runs a fresh <span class="text-accent">astro build</span> against the
      database, so there is no need to publish after every small change.
```
Replace with:
```
      <span class="text-accent">tip:</span> batch your edits, then publish once. Each
      publish runs a fresh <span class="text-accent">astro build</span> in GitHub Actions
      against the database, so there is no need to publish after every small change.
```

- [ ] **Step 7: Verify the build compiles the page**

Run: `bun run build`
Expected: build completes with no error.

- [ ] **Step 8: Commit (do not push yet)**

```bash
git add src/pages/admin/publish.astro
git -c user.name="Sheik Adhnan" -c user.email="adhnanmsa@gmail.com" commit -m "Publish UI: copy reflects GitHub Actions deploy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Update DEPLOY.md

**Files:**
- Modify: `DEPLOY.md`

- [ ] **Step 1: Update the intro paragraph**

Find:
```
backed by **Neon** (Postgres) and **Cloudflare R2** (image uploads). Edits in the admin
panel are saved to Neon immediately; the public site is rebuilt on demand via the
**Publish** button (a Cloudflare deploy hook).
```
Replace with:
```
backed by **Neon** (Postgres) and **UploadThing** (image uploads). Edits in the admin
panel are saved to Neon immediately; the public site is rebuilt by a **GitHub Actions**
workflow on every push to `main` and on demand via the **Publish** button (which
triggers the workflow via the GitHub API).
```

- [ ] **Step 2: Update the env var table rows**

Find:
```
| `CF_DEPLOY_HOOK_URL` | Triggers a rebuild on Publish | Cloudflare Pages deploy hook (step 5) |
```
Replace with:
```
| `GITHUB_DISPATCH_TOKEN` | Lets the Publish button trigger the deploy workflow | Fine-grained GitHub PAT on `karots-portfolio`, Actions: Read & write |
```

- [ ] **Step 3: Replace the "Cloudflare Pages" section (step 5)**

Find the whole `## 5. Cloudflare Pages` section (from its heading up to but not including `## 6. Image uploads`) and replace it with:

```
## 5. Deploys (GitHub Actions → Cloudflare Pages)

The site deploys via `.github/workflows/deploy.yml` — on every push to `main` and on
manual trigger. It builds with bun and runs `wrangler pages deploy dist` against the
**direct-upload** Pages project `karotsportfolio` (no Git connection on the CF side).

Set these as **GitHub → repo → Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (build-time content fetch) |
| `CLOUDFLARE_API_TOKEN` | CF token with **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | `a486bb41a30df886d13e0f6881632f18` |

The admin **Publish** button triggers this same workflow via the GitHub
`workflow_dispatch` API, authenticated with `GITHUB_DISPATCH_TOKEN` (a Cloudflare Pages
secret). `wrangler pages deploy` preserves existing Pages **secrets** and applies the
plain-text `vars` from `wrangler.jsonc`, so runtime config is not lost on deploy.
```

- [ ] **Step 4: Commit (do not push yet)**

```bash
git add DEPLOY.md
git -c user.name="Sheik Adhnan" -c user.email="adhnanmsa@gmail.com" commit -m "Docs: document GitHub Actions deploy pipeline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: MANUAL (user) — create the Cloudflare API token

This step is done by the user in the Cloudflare dashboard; Claude cannot click the OAuth/token UI.

- [ ] **Step 1:** Go to Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom Token**.
- [ ] **Step 2:** Permissions: **Account → Cloudflare Pages → Edit**. Account Resources: the account `Karots.dev@gmail.com` (`a486bb41a30df886d13e0f6881632f18`).
- [ ] **Step 3:** Create and copy the token value.
- [ ] **Step 4:** Provide the token (it becomes the GitHub secret `CLOUDFLARE_API_TOKEN` in Task 8 setup).

---

### Task 7: MANUAL (user) — create the GitHub dispatch PAT

- [ ] **Step 1:** GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**.
- [ ] **Step 2:** Repository access: **Only select repositories → `Adhnan23/karots-portfolio`**.
- [ ] **Step 3:** Permissions: **Repository permissions → Actions → Read and write**.
- [ ] **Step 4:** Generate and copy the token. Provide it to Claude (used in Task 9 to set the Cloudflare Pages secret `GITHUB_DISPATCH_TOKEN`).

---

### Task 8: MANUAL (user) — add the three GitHub repo secrets

GitHub repository secrets cannot be set from this machine (`gh` CLI is not installed and the value-encryption step needs a token), so the user pastes them in the UI.

- [ ] **Step 1:** GitHub → repo `karots-portfolio` → **Settings → Secrets and variables → Actions → New repository secret**.
- [ ] **Step 2:** Add `DATABASE_URL` — Claude provides the value from local `.env`.
- [ ] **Step 3:** Add `CLOUDFLARE_API_TOKEN` — the token from Task 6.
- [ ] **Step 4:** Add `CLOUDFLARE_ACCOUNT_ID` — value `a486bb41a30df886d13e0f6881632f18`.

---

### Task 9: Set the Cloudflare Pages dispatch secret + local `.dev.vars`

**Files:**
- Modify: `.dev.vars` (gitignored)

- [ ] **Step 1: Add the token to local `.dev.vars`** (so the local admin Publish button works)

Append the line (replace `<PAT>` with the Task 7 token):
```
GITHUB_DISPATCH_TOKEN=<PAT>
```

- [ ] **Step 2: Confirm `.dev.vars` is still gitignored**

Run: `git check-ignore .dev.vars`
Expected: `.dev.vars`

- [ ] **Step 3: Set the secret on the Cloudflare Pages production env via the cloudflare-api MCP**

Use the cloudflare-api MCP to PATCH the `karotsportfolio` project's production
`deployment_configs.production.env_vars`, adding `GITHUB_DISPATCH_TOKEN` as
`{ "type": "secret_text", "value": "<PAT>" }`. (Same mechanism used to set the other
Pages secrets.) Account `a486bb41a30df886d13e0f6881632f18`, project `karotsportfolio`.

- [ ] **Step 4: Verify the secret is registered (not its value)**

Confirm via the MCP GET of the project that `GITHUB_DISPATCH_TOKEN` appears in
`deployment_configs.production.env_vars` with type `secret_text`.

---

### Task 10: Push and verify the first auto-deploy

**Files:** none (push + observe)

- [ ] **Step 1: Push all commits to `main`**

```bash
git push origin main
```

- [ ] **Step 2: Verify the workflow ran green**

Open GitHub → repo → **Actions** → the "Deploy to Cloudflare Pages" run for this push.
Expected: build and deploy steps succeed; a new deployment appears under the
`karotsportfolio` project in Cloudflare.

- [ ] **Step 3: Verify the live site is intact**

Run: `bun -e "fetch('https://karots.lk/').then(r=>console.log(r.status))"`
Expected: `200`. Also confirm `https://karots.lk/admin/login` loads (admin runtime
secrets survived the deploy).

---

### Task 11: Verify the Publish button end-to-end

**Files:** none (manual smoke)

- [ ] **Step 1:** Log into `https://karots.lk/admin`, make a small visible content edit (e.g. profile tagline), save.
- [ ] **Step 2:** Go to **/admin/publish** and click **▲ publish site**. Expected: the green "Deploy triggered" banner.
- [ ] **Step 3:** Confirm a new run appears in GitHub **Actions** (triggered by `workflow_dispatch`) and goes green.
- [ ] **Step 4:** After ~1–2 min, reload the public page and confirm the edit is live. Revert the test edit and publish again if desired.

---

## Notes

- **Order matters:** code tasks (1–5) commit locally only. Secrets (6–9) must exist
  before the first push (10), or the first run fails at the deploy step (harmless;
  just re-run after secrets are set).
- **Security:** no secret is committed. `.env` / `.dev.vars` stay gitignored
  (verified in Task 9). The previously-shared secrets are tracked for rotation
  separately and are out of scope here.
