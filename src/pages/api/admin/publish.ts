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
