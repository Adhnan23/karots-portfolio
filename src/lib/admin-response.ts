/** Shared redirect helpers for admin form POST handlers. */
export function redirectBack(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 303,
    headers: { Location: qs ? `${path}?${qs}` : path },
  });
}

export function saved(path: string) {
  return redirectBack(path, { saved: "1" });
}
export function failed(path: string, msg = "1") {
  return redirectBack(path, { error: msg });
}
