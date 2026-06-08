import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { monitors, checks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fInt, fBool, slugify } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;
const PAGE = "/admin/monitors";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));
  try {
    if (action === "delete") {
      if (id) {
        // Remove the monitor and its recorded samples.
        await db.delete(checks).where(eq(checks.monitorId, id));
        await db.delete(monitors).where(eq(monitors.id, id));
      }
      return redirectBack(PAGE, { saved: "1" });
    }
    const name = fStr(fd, "name");
    const values = {
      name,
      slug: fStr(fd, "slug") || slugify(name),
      url: fStr(fd, "url"),
      enabled: fBool(fd, "enabled"),
      sort: fInt(fd, "sort", 0),
    };
    if (id) await db.update(monitors).set(values).where(eq(monitors.id, id));
    else await db.insert(monitors).values(values);
    return redirectBack(PAGE, { saved: "1" });
  } catch (err) {
    console.error("monitor save failed", err);
    return failed(PAGE);
  }
};
