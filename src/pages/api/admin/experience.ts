import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { experiences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fOpt, fInt } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/experience";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));
  try {
    if (action === "delete") {
      if (id) await db.delete(experiences).where(eq(experiences.id, id));
      return redirectBack(PAGE, { saved: "1" });
    }
    const values = {
      role: fStr(fd, "role"),
      company: fStr(fd, "company"),
      location: fStr(fd, "location"),
      startDate: fStr(fd, "startDate"),
      endDate: fOpt(fd, "endDate"),
      description: fStr(fd, "description"),
      type: (fStr(fd, "type", "work") === "other" ? "other" : "work") as "work" | "other",
      sort: fInt(fd, "sort", 0),
    };
    if (id) await db.update(experiences).set(values).where(eq(experiences.id, id));
    else await db.insert(experiences).values(values);
    return redirectBack(PAGE, { saved: "1" });
  } catch (err) {
    console.error("experience save failed", err);
    return failed(PAGE);
  }
};
