/**
 * Picks the single video shown with a chat answer.
 *
 * Input: the milestone's videos in the selected language (getMappedVideos), and the
 * sub-milestones the answer points to, most relevant first. A sub-milestone can have
 * several versions (Hebrew: educator + parent); only one video is ever returned.
 *
 *   1. the first focus sub-milestone that has a video -> its educator version (else both / unknown / parent)
 *   2. otherwise (fallback) the first video of the milestone in sequence order, same audience preference
 *   3. no video in the selected language -> null (the caller shows the "no video" notice; never another language)
 */
import type { VideoItem } from "@/server/knowledge/queries";

const AUDIENCE_ORDER: Record<VideoItem["audience"], number> = { educator: 0, both: 1, unknown: 2, parent: 3 };

const byAudience = (a: VideoItem, b: VideoItem) => AUDIENCE_ORDER[a.audience] - AUDIENCE_ORDER[b.audience];

export function selectAnswerVideo(videos: VideoItem[], focusSegments: string[]): { video: VideoItem; highlighted: boolean } | null {
  for (const code of focusSegments) {
    const forSegment = videos.filter((v) => v.activityCode === code || v.alsoFor.includes(code));
    if (forSegment.length) return { video: [...forSegment].sort(byAudience)[0], highlighted: true };
  }
  const fallback = [...videos].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999) || byAudience(a, b))[0];
  return fallback ? { video: fallback, highlighted: false } : null;
}
