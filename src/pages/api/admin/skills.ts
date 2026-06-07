import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fInt } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/skills";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));
  try {
    if (action === "delete") {
      if (id) await db.delete(skills).where(eq(skills.id, id));
      return redirectBack(PAGE, { saved: "1" });
    }
    const values = {
      category: fStr(fd, "category"),
      name: fStr(fd, "name"),
      sort: fInt(fd, "sort", 0),
    };
    if (id) await db.update(skills).set(values).where(eq(skills.id, id));
    else await db.insert(skills).values(values);
    return redirectBack(PAGE, { saved: "1" });
  } catch (err) {
    console.error("skill save failed", err);
    return failed(PAGE);
  }
};
