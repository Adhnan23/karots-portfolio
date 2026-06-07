import type { APIRoute } from "astro";
import { z } from "zod";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";

export const prerender = false;

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
  // honeypot — bots fill this; humans never see it
  website: z.string().max(0).optional(),
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Please fill in all fields with valid values." }, 422);
  }
  // Honeypot tripped → pretend success, drop silently.
  if (parsed.data.website) return json({ ok: true });

  try {
    const db = getDb(locals.runtime?.env);
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
    });
    return json({ ok: true });
  } catch (err) {
    console.error("contact insert failed", err);
    return json({ error: "Could not send right now. Please email instead." }, 500);
  }
};
