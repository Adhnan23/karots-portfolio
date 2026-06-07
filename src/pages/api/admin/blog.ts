import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fOpt, fBool, fInt, fList, slugify, readingTime } from "@/lib/forms";
import { redirectBack, failed } from "@/lib/admin-response";

export const prerender = false;

const LIST = "/admin/blog";

export const POST: APIRoute = async ({ request, locals }) => {
  const fd = await request.formData();
  const action = fStr(fd, "_action", "save");
  const id = fInt(fd, "id", 0);
  const db = getDb(envFromLocals(locals));

  try {
    if (action === "delete") {
      if (id) await db.delete(blogPosts).where(eq(blogPosts.id, id));
      return redirectBack(LIST, { saved: "1" });
    }

    const title = fStr(fd, "title");
    const slug = fStr(fd, "slug") || slugify(title);
    const body = fStr(fd, "body");
    const published = fBool(fd, "published");

    const values = {
      slug,
      title,
      excerpt: fStr(fd, "excerpt"),
      body,
      coverImageUrl: fOpt(fd, "coverImageUrl"),
      tags: fList(fd, "tags"),
      published,
      readingTime: readingTime(body),
      updatedAt: new Date(),
    };

    if (id) {
      // Set publishedAt the first time it goes public.
      const [existing] = await db
        .select({ publishedAt: blogPosts.publishedAt })
        .from(blogPosts)
        .where(eq(blogPosts.id, id));
      const publishedAt =
        published && !existing?.publishedAt ? new Date() : existing?.publishedAt ?? null;
      await db.update(blogPosts).set({ ...values, publishedAt }).where(eq(blogPosts.id, id));
    } else {
      await db.insert(blogPosts).values({
        ...values,
        publishedAt: published ? new Date() : null,
      });
    }
    return redirectBack(LIST, { saved: "1" });
  } catch (err) {
    console.error("blog save failed", err);
    return failed(id ? `${LIST}/${id}` : `${LIST}/new`);
  }
};
