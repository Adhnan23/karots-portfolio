import { GitHub } from "arctic";
import { resolveEnv, type AppEnv } from "@/lib/env";

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

function callbackUrl(env: AppEnv): string {
  const base = (env.PUBLIC_SITE_URL as string) || "http://localhost:4321";
  return new URL("/api/auth/github/callback", base).toString();
}

export function getGitHubProvider(runtimeEnv?: AppEnv): GitHub {
  const env = resolveEnv(runtimeEnv);
  const clientId = env.GITHUB_CLIENT_ID as string;
  const clientSecret = env.GITHUB_CLIENT_SECRET as string;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured (set GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).");
  }
  return new GitHub(clientId, clientSecret, callbackUrl(env));
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "karots-portfolio",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
  return res.json();
}

/** Owner login allowed to access the admin. */
export function allowedLogin(runtimeEnv?: AppEnv): string {
  return ((resolveEnv(runtimeEnv).ALLOWED_GITHUB_LOGIN as string) || "").toLowerCase();
}
