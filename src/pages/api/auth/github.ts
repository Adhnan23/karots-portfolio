import type { APIRoute } from "astro";
import { generateState } from "arctic";
import { getGitHubProvider } from "@/lib/auth/github";
import { STATE_COOKIE } from "@/lib/auth/session";
import { envFromLocals, isSecureRequest } from "@/lib/env";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect, locals, url }) => {
  const github = getGitHubProvider(envFromLocals(locals));
  const state = generateState();
  const authUrl = github.createAuthorizationURL(state, ["read:user"]);

  cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureRequest(url),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return redirect(authUrl.toString());
};
