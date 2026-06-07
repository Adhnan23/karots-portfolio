import type { APIRoute } from "astro";
import { envFromLocals, resolveEnv } from "@/lib/env";

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "application/pdf"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extFor(type: string): string {
  return (
    { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf" }[type] ?? "bin"
  );
}

export const POST: APIRoute = async ({ request, locals }) => {
  const runtimeEnv = envFromLocals(locals);
  const env = resolveEnv(runtimeEnv);
  const bucket = runtimeEnv?.R2 as R2Bucket | undefined;
  const publicBase = env.R2_PUBLIC_URL as string | undefined;

  if (!bucket || !publicBase) {
    return json(
      { error: "Image uploads aren't configured yet. Create an R2 bucket + set R2_PUBLIC_URL, or paste an image URL instead." },
      501
    );
  }

  let file: File | null = null;
  try {
    const fd = await request.formData();
    const f = fd.get("file");
    if (f instanceof File) file = f;
  } catch {
    return json({ error: "Invalid upload." }, 400);
  }
  if (!file) return json({ error: "No file provided." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "File too large (max 5MB)." }, 413);
  if (!ALLOWED.includes(file.type)) return json({ error: `Unsupported type: ${file.type}` }, 415);

  const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extFor(file.type)}`;
  try {
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return json({ url: `${publicBase.replace(/\/$/, "")}/${key}` });
  } catch (err) {
    console.error("R2 upload failed", err);
    return json({ error: "Upload failed." }, 500);
  }
};
