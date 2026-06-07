import type { APIRoute } from "astro";
import { resolveEnv } from "@/lib/env";
import { envFromLocals } from "@/lib/env";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/publish";

/**
 * Triggers a Cloudflare deploy hook to rebuild the static public site
 * from the latest Neon data. The hook URL is a secret (env var) so it is
 * never exposed to the browser.
 */
export const POST: APIRoute = async ({ locals }) => {
  const env = resolveEnv(envFromLocals(locals));
  const hook = env.CF_DEPLOY_HOOK_URL;

  if (typeof hook !== "string" || hook.length === 0) {
    return redirectBack(PAGE, { error: "unconfigured" });
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      console.error("deploy hook failed", res.status, await res.text().catch(() => ""));
      return redirectBack(PAGE, { error: "failed" });
    }
    return redirectBack(PAGE, { published: "1" });
  } catch (err) {
    console.error("deploy hook request error", err);
    return failed(PAGE);
  }
};
