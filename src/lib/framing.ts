/**
 * Hosting inside another site's iframe (a Hugging Face Space page shows the app in an iframe on
 * huggingface.co). Off unless ALLOWED_FRAME_ANCESTORS is set, e.g. "https://huggingface.co".
 */

/** Extra origins allowed to frame the app ("" = only the app itself). */
export function allowedFrameAncestors(): string {
  return (process.env.ALLOWED_FRAME_ANCESTORS ?? "").trim();
}

/**
 * Options for the anonymous per-device cookie. Inside a cross-site iframe a SameSite=Lax cookie is
 * never stored, so when framing is allowed it becomes a partitioned (CHIPS) SameSite=None cookie.
 */
export function clientCookieOptions() {
  const base = { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 365 };
  return allowedFrameAncestors()
    ? { ...base, sameSite: "none" as const, secure: true, partitioned: true }
    : { ...base, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
}
