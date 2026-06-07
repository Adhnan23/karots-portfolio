import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getBlogPosts } from "@/lib/content";

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const posts = await getBlogPosts();
  const site = context.site ?? new URL("https://karots.lk");

  return rss({
    title: "Mohammed Sheik Adhnan — Writing",
    description: "Notes on backend engineering, DevOps, and self-hosting.",
    site,
    items: posts.map((p) => ({
      title: p.title,
      description: p.excerpt,
      link: `/blog/${p.slug}/`,
      pubDate: p.publishedAt ?? p.createdAt,
      categories: p.tags ?? [],
    })),
    customData: "<language>en</language>",
  });
};
