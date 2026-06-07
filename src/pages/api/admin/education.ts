import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { education } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fInt } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/education";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));
  try {
    if (action === "delete") {
      if (id) await db.delete(education).where(eq(education.id, id));
      return redirectBack(PAGE, { saved: "1" });
    }
    const values = {
      qualification: fStr(fd, "qualification"),
      institution: fStr(fd, "institution"),
      result: fStr(fd, "result"),
      year: fStr(fd, "year"),
      sort: fInt(fd, "sort", 0),
    };
    if (id) await db.update(education).set(values).where(eq(education.id, id));
    else await db.insert(education).values(values);
    return redirectBack(PAGE, { saved: "1" });
  } catch (err) {
    console.error("education save failed", err);
    return failed(PAGE);
  }
};
