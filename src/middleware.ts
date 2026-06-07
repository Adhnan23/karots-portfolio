import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { resolveEnv, envFromLocals } from "@/lib/env";

const PUBLIC_PREFIXES = ["/admin/login", "/api/auth/"];

function isProtected(pathname: string): boolean {
  const guarded = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!guarded) return false;
  return !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, url } = context;
  locals.session = null;

  // Only touch cookies/headers for dynamic admin/api routes. Reading them on
  // prerendered public pages would trigger Astro build warnings and is wasteful.
  const dynamic = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api");
  if (dynamic) {
    const secret = resolveEnv(envFromLocals(locals)).SESSION_SECRET as string | undefined;
    const token = cookies.get(SESSION_COOKIE)?.value;
    if (token && secret) {
      locals.session = await verifySessionToken(token, secret);
    }
  }

  if (isProtected(url.pathname) && !locals.session) {
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/admin/login");
  }

  return next();
});
