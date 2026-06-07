import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { projects, type NewProject } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fOpt, fBool, fInt, fList, slugify } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;

const LIST = "/admin/projects";

type Src = NewProject["source"];
type Demo = NewProject["demoStatus"];

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));

  try {
    if (action === "delete") {
      if (id) await db.delete(projects).where(eq(projects.id, id));
      return redirectBack(LIST, { saved: "1" });
    }

    const title = fStr(fd, "title");
    const slug = fStr(fd, "slug") || slugify(title);
    const values = {
      slug,
      title,
      summary: fStr(fd, "summary"),
      description: fStr(fd, "description"),
      tech: fList(fd, "tech"),
      role: fStr(fd, "role"),
      category: fStr(fd, "category", "app"),
      repoUrl: fOpt(fd, "repoUrl"),
      liveUrl: fOpt(fd, "liveUrl"),
      source: fStr(fd, "source", "repo") as Src,
      demoStatus: fStr(fd, "demoStatus", "none") as Demo,
      featured: fBool(fd, "featured"),
      coverImageUrl: fOpt(fd, "coverImageUrl"),
      dateRange: fStr(fd, "dateRange"),
      published: fBool(fd, "published"),
      sort: fInt(fd, "sort", 0),
      updatedAt: new Date(),
    };

    if (id) {
      await db.update(projects).set(values).where(eq(projects.id, id));
    } else {
      await db.insert(projects).values(values);
    }
    return redirectBack(LIST, { saved: "1" });
  } catch (err) {
    console.error("project save failed", err);
    return failed(id ? `${LIST}/${id}` : `${LIST}/new`);
  }
};
