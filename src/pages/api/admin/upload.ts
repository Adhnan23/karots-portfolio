import type { APIRoute } from "astro";
import { UTApi } from "uploadthing/server";
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

  const utToken = env.UPLOADTHING_TOKEN as string | undefined;
  const bucket = runtimeEnv?.R2 as R2Bucket | undefined;
  const r2Base = env.R2_PUBLIC_URL as string | undefined;

  if (!utToken && !(bucket && r2Base)) {
    return json(
      { error: "Image uploads aren't configured yet. Set UPLOADTHING_TOKEN (or R2), or paste an image URL instead." },
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

  // Preferred: UploadThing (works without Cloudflare R2).
  if (utToken) {
    try {
      const utapi = new UTApi({ token: utToken });
      const named = new File(
        [await file.arrayBuffer()],
        `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extFor(file.type)}`,
        { type: file.type }
      );
      const res = await utapi.uploadFiles(named);
      if (res.error || !res.data) {
        console.error("UploadThing upload failed", res.error);
        return json({ error: "Upload failed." }, 500);
      }
      return json({ url: res.data.ufsUrl });
    } catch (err) {
      console.error("UploadThing upload error", err);
      return json({ error: "Upload failed." }, 500);
    }
  }

  // Fallback: Cloudflare R2 (if a bucket binding + public URL are configured).
  const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extFor(file.type)}`;
  try {
    await bucket!.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return json({ url: `${r2Base!.replace(/\/$/, "")}/${key}` });
  } catch (err) {
    console.error("R2 upload failed", err);
    return json({ error: "Upload failed." }, 500);
  }
};
