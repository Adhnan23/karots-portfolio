/** Small helpers for reading HTML form submissions in admin API routes. */

export function fStr(fd: FormData, key: string, def = ""): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : def;
}

export function fOpt(fd: FormData, key: string): string | null {
  const v = fStr(fd, key);
  return v === "" ? null : v;
}

export function fBool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function fInt(fd: FormData, key: string, def = 0): number {
  const n = parseInt(fStr(fd, key), 10);
  return Number.isNaN(n) ? def : n;
}

/** Comma- or newline-separated list → trimmed string[]. */
export function fList(fd: FormData, key: string): string[] {
  return fStr(fd, key)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** slugify a title for use as a URL slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readingTime(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
