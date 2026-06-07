import type { APIRoute } from "astro";
import { clearSessionCookie } from "@/lib/auth/session";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  clearSessionCookie(cookies);
  return redirect("/admin/login");
};

// Allow GET as a convenience (e.g. a plain link), too.
export const GET = POST;
