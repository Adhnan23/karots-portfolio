import { SignJWT, jwtVerify } from "jose";
import type { AstroCookies } from "astro";

/**
 * Stateless admin sessions: a signed JWT stored in an HttpOnly cookie. The owner
 * is the only valid subject (enforced at OAuth callback against ALLOWED_GITHUB_LOGIN).
 */
export interface AdminSession {
  login: string;
  id: number;
  name?: string;
  avatarUrl?: string;
  exp: number;
}

export const SESSION_COOKIE = "admin_session";
export const STATE_COOKIE = "gh_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: Omit<AdminSession, "exp">,
  secret: string
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret));
    if (typeof payload.login !== "string" || typeof payload.id !== "number") return null;
    return {
      login: payload.login,
      id: payload.id,
      name: payload.name as string | undefined,
      avatarUrl: payload.avatarUrl as string | undefined,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string, secure: boolean) {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}
