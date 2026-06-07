import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { profile, type SocialLink } from "@/db/schema";
import { eq } from "drizzle-orm";
import { envFromLocals } from "@/lib/env";
import { fStr, fOpt } from "@/lib/forms";
import { saved, failed } from "@/lib/admin-response";

export const prerender = false;

const PAGE = "/admin/profile";

/** Parse "Label | https://url" lines into SocialLink[]. */
function parseSocials(raw: string): SocialLink[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => s.trim());
      return { label: label ?? "", url: url ?? "" };
    })
    .filter((s) => s.label && s.url);
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const fd = await request.formData();
    const db = getDb(envFromLocals(locals));
    await db
      .update(profile)
      .set({
        name: fStr(fd, "name"),
        title: fStr(fd, "title"),
        tagline: fStr(fd, "tagline"),
        summary: fStr(fd, "summary"),
        location: fStr(fd, "location"),
        email: fStr(fd, "email"),
        phone: fStr(fd, "phone"),
        website: fStr(fd, "website"),
        avatarUrl: fOpt(fd, "avatarUrl"),
        resumeUrl: fOpt(fd, "resumeUrl"),
        socials: parseSocials(fStr(fd, "socials")),
        updatedAt: new Date(),
      })
      .where(eq(profile.id, 1));
    return saved(PAGE);
  } catch (err) {
    console.error("profile update failed", err);
    return failed(PAGE);
  }
};
