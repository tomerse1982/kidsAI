"use client";

import { BadgeCheck, BookOpen, Bookmark, BookmarkCheck, ExternalLink, FileText, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { ExerciseItem, MilestoneSummary, SourceRef, VideoItem } from "@/server/knowledge/queries";
import { Badge, Card, Code, cn } from "./ui/primitives";

// ------------------------------------------------------------------ video ----

export function VideoLangBadge({ video, lang }: { video: Pick<VideoItem, "language" | "languageStatus">; lang: Lang }) {
  const d = t(lang);
  const label = video.language === "ar" ? d.arabicVideo : d.hebrewVideo;
  return (
    <Badge tone={video.language === "ar" ? "pink" : "sky"} data-testid="video-lang" data-language-status={video.languageStatus} title={video.languageStatus === "verified" ? d.languageVerified : undefined}>
      {label}
      {video.languageStatus === "verified" ? <BadgeCheck size={12} aria-label={d.languageVerified} /> : null}
    </Badge>
  );
}

/** Label for a video: the segment title in the selected language, else its code (never another language). */
function videoLabel(video: VideoItem, lang: Lang): string {
  const d = t(lang);
  if (video.title) return video.title;
  return video.activityCode ? `${d.subMilestone} ${video.activityCode}` : `${d.milestoneVideo} ${video.milestoneCode}`;
}

/** Lite YouTube player: thumbnail first; the (privacy-enhanced) iframe loads only after the user taps play. */
export function VideoCard({ video, lang, highlighted }: { video: VideoItem; lang: Lang; highlighted?: boolean }) {
  const d = t(lang);
  const [playing, setPlaying] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  const label = videoLabel(video, lang);
  return (
    <Card className={cn("overflow-hidden p-0", highlighted && "ring-2 ring-sage-500")} data-testid="video-card" data-video-id={video.videoId} data-audience={video.audience}>
      <div className="relative aspect-video bg-sky-100">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`${video.embedUrl}?autoplay=1&rel=0&hl=${lang}`}
            title={label}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            data-testid="video-iframe"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`${d.play}: ${label}`} data-testid="video-play">
            {thumbOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setThumbOk(false)} />
            ) : null}
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/20">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg">
                <Play className="ms-1 text-blush-700" fill="currentColor" size={26} aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <VideoLangBadge video={video} lang={lang} />
          <Badge tone={video.audience === "parent" ? "amber" : "sage"} data-testid="video-audience">{video.audience === "parent" ? d.forParents : d.forEducators}</Badge>
          {video.activityCode ? <Badge tone="gray">{d.subMilestone} <Code>{video.activityCode}</Code></Badge> : null}
          {video.alsoFor.map((c) => <Badge key={c} tone="gray"><Code>{c}</Code></Badge>)}
          {highlighted ? <Badge tone="sage"><Sparkles size={12} aria-hidden /></Badge> : null}
          <span className="ms-auto"><BookmarkButton itemType="video" itemKey={`youtube:${video.videoId}`} lang={lang} compact /></span>
        </div>
        <p className="text-sm font-medium leading-snug">{label}</p>
        {/* the original URL from the workbook, opened as is */}
        <a href={video.canonicalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-sky-700 underline-offset-4 hover:underline" data-testid="video-link">
          <ExternalLink size={14} aria-hidden /> {d.openOnYoutube}
        </a>
      </div>
    </Card>
  );
}

/**
 * Videos in the selected language only. Educator versions first; parent versions grouped below.
 * When there is none, an explicit notice is shown — never a video in another language.
 */
export function VideoList({ videos, lang, highlightedIds = [], notice }: { videos: VideoItem[]; lang: Lang; highlightedIds?: string[]; notice?: string | null }) {
  const d = t(lang);
  if (!videos.length) return <p className="rounded-xl bg-sky-50 p-3 text-sm text-muted" data-testid="no-video-notice">{notice ?? d.noVideos}</p>;
  // a highlighted parent version moves up only when its sub-milestone has no other version in the main grid
  const hasMainVersion = (p: VideoItem) => videos.some((v) => v.audience !== "parent" && v.activityCode === p.activityCode);
  const promoted = (v: VideoItem) => highlightedIds.includes(v.videoId) && !hasMainVersion(v);
  const main = videos.filter((v) => v.audience !== "parent" || promoted(v));
  const parents = videos.filter((v) => v.audience === "parent" && !promoted(v));
  const grid = (list: VideoItem[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((v) => <VideoCard key={v.videoId} video={v} lang={lang} highlighted={highlightedIds.includes(v.videoId)} />)}
    </div>
  );
  return (
    <div className="space-y-3">
      {main.length ? grid(main) : null}
      {parents.length ? (
        <details className="rounded-2xl bg-white p-3 ring-1 ring-blush-100" data-testid="parent-videos" open={!main.length}>
          <summary className="cursor-pointer text-sm font-medium text-blush-700">{d.parentVersions} ({parents.length})</summary>
          <div className="mt-3">{grid(parents)}</div>
        </details>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------- milestone ----

export function DomainBadge({ domain, lang }: { domain: string | null; lang: Lang }) {
  const d = t(lang);
  if (!domain) return <Badge tone="gray">{d.noDomain}</Badge>;
  const tone = domain === "social" ? "pink" : domain === "language" ? "amber" : domain === "gross_motor" ? "sky" : "sage";
  return <Badge tone={tone}>{d.domains[domain] ?? domain}</Badge>;
}

export function MilestoneCard({ m, lang, href = true }: { m: MilestoneSummary & { reviewStatus?: string }; lang: Lang; href?: boolean }) {
  const d = t(lang);
  const body = (
    <Card className="bg-gradient-to-br from-white to-sky-50" data-testid="milestone-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted">{d.milestoneCode} <Code>{m.code}</Code></p>
          <h3 className="text-lg font-semibold leading-snug">{m.title ?? d.noTitleInLanguage}</h3>
        </div>
        <span className="grid h-11 min-w-11 place-items-center rounded-2xl bg-blush-100 px-2 font-bold text-blush-700"><Code>{m.code}</Code></span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="sky">{d.ageGroup}: {m.ageGroup.sourceText ?? m.ageGroup.label}</Badge>
        <DomainBadge domain={m.domain} lang={lang} />
        {m.videoCount ? <Badge tone="pink">{m.videoCount} {d.videoCount}</Badge> : null}
        {m.reviewStatus === "needs_review" ? <Badge tone="amber">{d.reviewBadge}</Badge> : null}
      </div>
    </Card>
  );
  return href ? <Link href={`/milestones/${m.code}`} className="block rounded-[var(--radius-card)]">{body}</Link> : body;
}

// --------------------------------------------------------------- activity ----

export function ActivityCard({ a, lang }: { a: ExerciseItem; lang: Lang }) {
  const d = t(lang);
  const steps = (a.instructions ?? "").split(/(?<=[.!?؟])\s+/u).filter((s) => s.trim().length > 2);
  return (
    <Card className="border-s-4 border-sage-200" data-testid="activity-card" data-activity-code={a.code}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{a.title}</h3>
        <BookmarkButton itemType="activity" itemKey={a.code} lang={lang} compact />
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
        <span>{d.milestoneCode} <Code>{a.code}</Code></span>
        {a.relatedSegments.length ? <span>· {d.subMilestone} {a.relatedSegments.map((s) => <Code key={s.code} className="me-1">{s.code}</Code>)}</span> : null}
        {a.verification === "needs_review" ? <Badge tone="amber">{d.reviewBadge}</Badge> : null}
      </div>
      {steps.length > 1 ? (
        <details className="mt-2 group" open={steps.length <= 3}>
          <summary className="cursor-pointer text-sm font-medium text-sky-700">{d.steps}</summary>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm leading-relaxed">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">{a.instructions}</p>
      )}
      {a.source ? <SourceLink s={a.source} lang={lang} className="mt-3" /> : null}
    </Card>
  );
}

// ---------------------------------------------------------------- sources ----

export function SourceLink({ s, lang, className }: { s: SourceRef; lang: Lang; className?: string }) {
  const d = t(lang);
  if (!s.url) {
    // the PDF file is not available on the server: state it, do not render a dead link
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted", className)} data-testid="source-unavailable">
        <FileText size={15} aria-hidden /> {d.page} <Code>{s.printedPage ?? s.pdfPageIndex + 1}</Code> · {d.sourceFileUnavailable}
      </span>
    );
  }
  return (
    <a href={s.url} target="_blank" rel="noopener" className={cn("inline-flex items-center gap-1.5 text-sm text-sky-700 hover:underline", className)} data-testid="source-link" data-page-index={s.pdfPageIndex}>
      <FileText size={15} aria-hidden />
      {d.viewHandbookPage} · {d.page} <Code>{s.printedPage ?? s.pdfPageIndex + 1}</Code>
    </a>
  );
}

export function SourceCard({ sources, lang }: { sources: SourceRef[]; lang: Lang }) {
  const d = t(lang);
  if (!sources.length) return null;
  const main = sources[0];
  const pages = [...new Set(sources.map((s) => s.printedPage ?? s.pdfPageIndex + 1))].sort((a, b) => a - b);
  return (
    <Card className="bg-sage-50" data-testid="source-card">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-1 shrink-0 text-sage-700" size={22} aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{main.document}</p>
          <p>{d.milestoneCode} <Code>{main.milestoneCode}</Code> · {d.page} {pages.map((p, i) => <span key={p}>{i ? ", " : ""}<Code>{p}</Code></span>)}</p>
          <SourceLink s={main} lang={lang} />
        </div>
      </div>
    </Card>
  );
}

// -------------------------------------------------------------- bookmarks ----

export function BookmarkButton({ itemType, itemKey, lang, compact }: { itemType: "milestone" | "activity" | "video"; itemKey: string; lang: Lang; compact?: boolean }) {
  const d = t(lang);
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/bookmarks").then((r) => r.json()).then((list: { itemType: string; itemKey: string }[]) => {
      if (alive) setSaved(list.some((b) => b.itemType === itemType && b.itemKey === itemKey));
    }).catch(() => alive && setSaved(false));
    return () => { alive = false; };
  }, [itemType, itemKey]);
  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    const res = await fetch("/api/bookmarks", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemType, itemKey }) });
    if (!res.ok) setSaved(!next);
  };
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saved === null}
      aria-pressed={Boolean(saved)}
      className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm", saved ? "bg-blush-100 text-blush-700" : "bg-white text-muted ring-1 ring-blush-200", compact && "min-h-9 px-2")}
      data-testid={`bookmark-${itemType}`}
      aria-label={saved ? d.saved : d.save}
    >
      <Icon size={18} aria-hidden fill={saved ? "currentColor" : "none"} />
      {compact ? null : saved ? d.saved : d.save}
    </button>
  );
}
