/**
 * Verifies every video against YouTube itself (public pages, no API key):
 *  1. availability                      — oEmbed
 *  2. title vs. mapped code             — Arabic "A1.1.3"; Hebrew educator "1.1.3"; Hebrew parent "P1.1.3"
 *  3. spoken language                   — language of YouTube's automatic speech-recognition caption track
 *                                         ("kind: asr"), i.e. detected from the audio, not from titles or names
 *
 * Title verdicts: match -> confirms the workbook row; same_milestone -> the video belongs to the milestone
 * but not demonstrably to that sub-milestone (shown at milestone level only); different -> the sources
 * contradict each other (mapping set to conflict = hidden until an admin reviews it).
 * Admin decisions are never overwritten.
 *   npx tsx scripts/check-videos.ts [--limit=N] [--only=<videoId>] [--language=he|ar] [--skip-asr]
 *                                   [--only-unverified] [--concurrency=6] [--delay-ms=0]
 */
import "dotenv/config";
import { compareTitleCode, parseVideoTitleCode } from "@/lib/codes";
import { createPrisma } from "@/server/prisma-factory";

const ISSUE_CODES = ["video_unavailable", "video_title_mismatch", "video_check_failed", "video_language_conflict", "video_language_unverified"];

async function get(url: string, timeoutMs = 20_000): Promise<Response | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "Accept-Language": "en", "User-Agent": "Mozilla/5.0 (compatible; kidsai-source-check)" } });
      if (res.status < 500) return res;
    } catch {
      /* transient network error: retry */
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

async function oembed(id: string): Promise<{ status: number; title?: string }> {
  const res = await get(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`);
  if (!res) return { status: 0 };
  if (res.status !== 200) return { status: res.status };
  return { status: 200, title: ((await res.json()) as { title: string }).title };
}

/**
 * Language of the automatic (speech-recognition) caption track. ok=false when YouTube did not serve
 * the page (e.g. rate limiting) — then nothing is concluded; language=null when the page has no ASR track.
 */
export async function asrLanguage(id: string): Promise<{ ok: boolean; language: string | null }> {
  const res = await get(`https://www.youtube.com/watch?v=${id}&hl=en`, 30_000);
  if (!res || res.status !== 200 || res.url.includes("google.com/sorry")) return { ok: false, language: null };
  const html = await res.text();
  if (!html.includes('"videoDetails"')) return { ok: false, language: null };
  const i = html.indexOf('"captionTracks":');
  if (i < 0) return { ok: true, language: null };
  const s = html.slice(i + 16);
  let depth = 0;
  let end = 0;
  for (; end < s.length; end++) {
    if (s[end] === "[") depth++;
    else if (s[end] === "]" && --depth === 0) break;
  }
  try {
    const tracks = JSON.parse(s.slice(0, end + 1)) as { languageCode: string; kind?: string }[];
    const asr = tracks.find((t) => t.kind === "asr");
    if (!asr) return { ok: true, language: null };
    const code = asr.languageCode.split("-")[0];
    return { ok: true, language: code === "iw" ? "he" : code }; // YouTube uses the legacy code "iw" for Hebrew
  } catch {
    return { ok: false, language: null };
  }
}

const EXPECTED_PREFIX = (language: string, audience: string) => (language === "ar" ? "A" : audience === "parent" ? "P" : "");

export function titleVerdict(title: string | undefined, language: string, audience: string, code: string): "match" | "same_milestone" | "different" | null {
  const t = parseVideoTitleCode(title);
  if (!title || !t) return null; // the title carries no code: no evidence either way
  if (t.retired || t.prefix !== EXPECTED_PREFIX(language, audience)) return "different";
  const c = compareTitleCode(t.code, code);
  return c === "match" ? "match" : c === "same_milestone" ? "same_milestone" : "different";
}

async function main() {
  const db = createPrisma();
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  const only = arg("only");
  const language = arg("language");
  const skipAsr = process.argv.includes("--skip-asr");
  const onlyUnverified = process.argv.includes("--only-unverified");
  const concurrency = Number(arg("concurrency") ?? 6);
  const delayMs = Number(arg("delay-ms") ?? 0);
  const videos = await db.video.findMany({
    where: {
      ...(only ? { providerVideoId: only } : {}),
      ...(language ? { language: language as "he" | "ar" } : {}),
      ...(onlyUnverified ? { languageStatus: "source_metadata" } : {}),
    },
    include: { mappings: { include: { activity: { select: { activityCode: true } } } } },
    take: Number(arg("limit") ?? 100_000),
    orderBy: { createdAt: "asc" },
  });
  const ids = new Set(videos.map((v) => v.providerVideoId));
  const old = await db.importIssue.findMany({ where: { code: { in: ISSUE_CODES } }, select: { id: true, details: true } });
  await db.importIssue.deleteMany({ where: { id: { in: old.filter((i) => ids.has(String((i.details as { videoId?: string })?.videoId))).map((i) => i.id) } } });

  const counts = { checked: 0, available: 0, unavailable: 0, error: 0, titleMatch: 0, titleSameMilestone: 0, titleDifferent: 0, langVerified: 0, langConflict: 0, langNoTrack: 0, langCheckFailed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < videos.length) {
      const v = videos[next++];
      counts.checked++;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const o = await oembed(v.providerVideoId);
      const availability = o.status === 200 ? "available" : o.status === 0 ? "error" : "unavailable";
      counts[availability]++;
      const asr = !skipAsr && availability === "available" ? await asrLanguage(v.providerVideoId) : { ok: false, language: null };
      if (!skipAsr && availability === "available" && !asr.ok) counts.langCheckFailed++;
      const languageStatus = !asr.ok ? v.languageStatus : asr.language === null ? v.languageStatus : asr.language === v.language ? "verified" : "conflict";
      if (asr.ok && asr.language === null) counts.langNoTrack++;
      else if (asr.ok && languageStatus === "verified") counts.langVerified++;
      else if (asr.ok && languageStatus === "conflict") counts.langConflict++;

      const evidence = (v.languageEvidence as { source: string }[]).filter((e) => e.source !== "youtube_asr");
      if (asr.language) evidence.push({ source: "youtube_asr", value: asr.language } as never);
      await db.video.update({
        where: { id: v.id },
        data: {
          availabilityStatus: availability, lastCheckedAt: new Date(), providerTitle: o.title ?? v.providerTitle,
          ...(asr.ok ? { detectedLanguage: asr.language, languageStatus, languageEvidence: evidence as never } : {}),
        },
      });

      if (availability !== "available") {
        await db.importIssue.create({ data: { sourceFile: "youtube oEmbed", severity: availability === "error" ? "info" : "error", code: availability === "error" ? "video_check_failed" : "video_unavailable", message: `Video ${v.providerVideoId}: oEmbed HTTP ${o.status}; ${availability === "unavailable" ? "not shown until it is available again" : "check failed, will retry"}`, details: { videoId: v.providerVideoId } } });
      }
      if (asr.ok && languageStatus === "conflict") {
        await db.importIssue.create({ data: { sourceFile: "youtube captions", severity: "error", code: "video_language_conflict", message: `Video ${v.providerVideoId} is listed as ${v.language} but YouTube's speech recognition detects "${asr.language}"; hidden in every language until resolved`, details: { videoId: v.providerVideoId, declared: v.language, detected: asr.language } } });
      } else if (asr.ok && asr.language === null) {
        await db.importIssue.create({ data: { sourceFile: "youtube captions", severity: "info", code: "video_language_unverified", message: `Video ${v.providerVideoId}: no automatic caption track, spoken language not verified (declared ${v.language} by the workbook)`, details: { videoId: v.providerVideoId } } });
      }

      for (const m of v.mappings) {
        if (!m.activity) continue;
        const verdict = titleVerdict(o.title, m.language, m.audience, m.activity.activityCode);
        if (verdict === "match") counts.titleMatch++;
        else if (verdict === "same_milestone") counts.titleSameMilestone++;
        else if (verdict === "different") counts.titleDifferent++;
        const kept = (m.validationNotes as { check: string; result: string; detail?: string }[]).filter((n) => !["youtube_title", "youtube_language"].includes(n.check));
        const notes = [
          ...kept,
          ...(verdict === null ? [] : [{ check: "youtube_title", result: verdict === "match" ? "match" : "mismatch", scope: verdict, detail: `YouTube "${o.title}" for ${m.activity.activityCode}` }]),
          ...(v.detectedLanguage || asr.language ? [{ check: "youtube_language", result: languageStatus === "verified" ? "match" : languageStatus === "conflict" ? "mismatch" : "not_applicable", detail: `audio: ${asr.language ?? v.detectedLanguage}` }] : []),
        ];
        const adminDecided = kept.some((n) => n.check === "admin_review");
        // a shifted column-A label is resolved when the video's own title confirms the column-B code
        const blocking = notes.filter((n) => n.result === "mismatch" && !(n.check === "milestone_column" && verdict === "match"));
        const confidenceStatus = adminDecided ? m.confidenceStatus
          : verdict === "different" || languageStatus === "conflict" ? "conflict"
          : blocking.length ? "needs_review"
          : verdict === "match" && (languageStatus === "verified" || m.confidenceStatus === "verified") ? "verified"
          : m.confidenceStatus === "conflict" ? "needs_review" : m.confidenceStatus;
        await db.activityVideoMapping.update({ where: { id: m.id }, data: { validationNotes: notes as never, confidenceStatus } });
        if (verdict && verdict !== "match") {
          const hidden = verdict === "different";
          await db.importIssue.create({
            data: {
              sourceFile: "youtube oEmbed", severity: hidden ? "error" : "warning", code: "video_title_mismatch",
              message: `Video ${v.providerVideoId}: YouTube title "${o.title}" vs ${m.language}/${m.audience} ${m.activity.activityCode} (${m.sourceSheet}!${m.sourceRowNumber}) — ${hidden ? "different milestone or series: hidden until reviewed" : "same milestone, other sub-milestone: shown at milestone level only"}`,
              details: { videoId: v.providerVideoId, title: o.title, code: m.activity.activityCode, scope: verdict },
            },
          });
        }
      }
      if (counts.checked % 100 === 0) console.log(`  ${counts.checked}/${videos.length}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  await db.importIssue.deleteMany({ where: { code: "video_language_check_incomplete" } });
  const pending = await db.video.count({ where: { languageStatus: "source_metadata" } });
  if (pending) {
    await db.importIssue.create({
      data: {
        sourceFile: "youtube captions", severity: "info", code: "video_language_check_incomplete",
        message: `${pending} videos have a workbook-declared language that YouTube speech recognition has not confirmed yet (no caption track or request refused/rate-limited). Re-run: npm run videos:check -- --only-unverified --concurrency=1 --delay-ms=4000`,
        details: { pending, failedThisRun: counts.langCheckFailed },
      },
    });
  }
  console.log(JSON.stringify(counts));
  await db.$disconnect();
}

if (process.argv[1]?.includes("check-videos")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
