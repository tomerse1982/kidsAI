import "server-only";
import { cookies, headers } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./i18n";

/** UI language: cookie first, then the browser's Accept-Language, default Hebrew. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^ar\b|,\s*ar\b/.test(accept) && !/^he\b/.test(accept) ? "ar" : "he";
}
