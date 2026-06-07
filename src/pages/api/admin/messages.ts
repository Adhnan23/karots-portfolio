import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fInt } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/messages";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));
  try {
    if (!id) return redirectBack(PAGE);
    if (action === "delete") {
      await db.delete(contactMessages).where(eq(contactMessages.id, id));
    } else if (action === "toggle-read") {
      const [m] = await db
        .select({ read: contactMessages.read })
        .from(contactMessages)
        .where(eq(contactMessages.id, id));
      await db
        .update(contactMessages)
        .set({ read: !m?.read })
        .where(eq(contactMessages.id, id));
    }
    return redirectBack(PAGE, { saved: "1" });
  } catch (err) {
    console.error("message action failed", err);
    return failed(PAGE);
  }
};
