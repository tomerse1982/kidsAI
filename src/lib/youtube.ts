/** YouTube identifier normalisation. Video ids are 11 chars of [A-Za-z0-9_-]. */

const ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeParse =
  | { ok: true; id: string; form: "id" | "short_url" | "watch_url" | "embed_url" | "shorts_url"; playlist?: string }
  | { ok: false; reason: "empty" | "not_youtube" | "invalid_id"; raw: string };

export function parseYouTube(raw: unknown): YouTubeParse {
  if (raw === null || raw === undefined || String(raw).trim() === "") return { ok: false, reason: "empty", raw: "" };
  const text = String(raw).trim();
  if (ID.test(text)) return { ok: true, id: text, form: "id" };

  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "invalid_id", raw: text };
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const playlist = url.searchParams.get("list") ?? undefined;
  let id: string | null = null;
  let form: "short_url" | "watch_url" | "embed_url" | "shorts_url" = "watch_url";
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
    form = "short_url";
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2];
      form = "embed_url";
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2];
      form = "shorts_url";
    }
  } else {
    return { ok: false, reason: "not_youtube", raw: text };
  }
  if (!id || !ID.test(id)) return { ok: false, reason: "invalid_id", raw: text };
  return { ok: true, id, form, ...(playlist ? { playlist } : {}) };
}

export const youTubeUrls = (id: string) => ({
  canonicalUrl: `https://youtu.be/${id}`,
  watchUrl: `https://www.youtube.com/watch?v=${id}`,
  // privacy-enhanced embed host: no cookies until the viewer presses play
  embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
});
