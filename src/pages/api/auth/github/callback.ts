import type { APIRoute } from "astro";
import { OAuth2RequestError } from "arctic";
import { getGitHubProvider, fetchGitHubUser, allowedLogin } from "@/lib/auth/github";
import {
  STATE_COOKIE,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { envFromLocals, resolveEnv, isSecureRequest } from "@/lib/env";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect, locals }) => {
  const env = envFromLocals(locals);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: "/" });

  if (!code || !state || !storedState || state !== storedState) {
    return redirect("/admin/login?error=state");
  }

  try {
    const github = getGitHubProvider(env);
    const tokens = await github.validateAuthorizationCode(code);
    const user = await fetchGitHubUser(tokens.accessToken());

    // Only the owner may sign in.
    if (user.login.toLowerCase() !== allowedLogin(env)) {
      return redirect("/admin/login?error=forbidden");
    }

    const secret = resolveEnv(env).SESSION_SECRET as string;
    const token = await createSessionToken(
      {
        login: user.login,
        id: user.id,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url,
      },
      secret
    );
    setSessionCookie(cookies, token, isSecureRequest(url));
    return redirect("/admin");
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      return redirect("/admin/login?error=oauth");
    }
    console.error("OAuth callback failed", err);
    return redirect("/admin/login?error=unknown");
  }
};
