/**
 * Admin session shape. The signing/verification logic (jose) is implemented in
 * Phase 4; this module currently only exports the type used by App.Locals.
 */
export interface AdminSession {
  /** GitHub login of the authenticated owner. */
  login: string;
  /** GitHub numeric id. */
  id: number;
  /** Display name / avatar for the admin UI. */
  name?: string;
  avatarUrl?: string;
  /** Unix seconds. */
  exp: number;
}
