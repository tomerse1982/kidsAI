import { describe, expect, it } from "vitest";
import { selectAnswerVideo } from "@/lib/answer-video";
import type { VideoItem } from "@/server/knowledge/queries";

const video = (videoId: string, activityCode: string | null, audience: VideoItem["audience"], language: VideoItem["language"] = "he", extra: Partial<VideoItem> = {}): VideoItem => ({
  videoId, provider: "youtube", canonicalUrl: `https://youtu.be/${videoId}`, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
  thumbnailUrl: "", language, languageStatus: "source_metadata", audience, milestoneCode: "1.1", activityCode, alsoFor: [], title: null,
  sequence: activityCode ? Number(activityCode.split(".")[2]) : null, role: null, mappingType: "direct", confidence: "confirmed",
  availability: "available", source: { sheet: "s", row: 1, document: "d" }, ...extra,
});

// Hebrew workbook: an educator and a parent version per sub-milestone
const he = [
  video("he111e", "1.1.1", "educator"), video("he111p", "1.1.1", "parent"),
  video("he112e", "1.1.2", "educator"), video("he112p", "1.1.2", "parent"),
  video("he113e", "1.1.3", "educator"), video("he113p", "1.1.3", "parent"),
];
// Arabic workbook: one video per sub-milestone
const ar = [video("ar111", "1.1.1", "educator", "ar"), video("ar112", "1.1.2", "educator", "ar"), video("ar113", "1.1.3", "educator", "ar")];

describe("selectAnswerVideo — one video per answer", () => {
  it("Hebrew: returns only the educator version of the most relevant sub-milestone", () => {
    expect(selectAnswerVideo(he, ["1.1.3", "1.1.2"])).toEqual({ video: he[4], highlighted: true });
  });

  it("Arabic: returns a single video for the most relevant sub-milestone", () => {
    expect(selectAnswerVideo(ar, ["1.1.2", "1.1.3"])).toEqual({ video: ar[1], highlighted: true });
  });

  it("keeps the relevance order of the focus list, not the sequence order", () => {
    expect(selectAnswerVideo(he, ["1.1.3", "1.1.1"])?.video.videoId).toBe("he113e");
  });

  it("falls back to the parent version when a sub-milestone has no educator version", () => {
    const onlyParent = he.filter((v) => v.videoId !== "he113e");
    expect(selectAnswerVideo(onlyParent, ["1.1.3"])?.video.videoId).toBe("he113p");
  });

  it("matches a video mapped to several sub-milestones (alsoFor)", () => {
    const shared = [video("shared", "1.1.1", "educator", "ar", { alsoFor: ["1.1.4"] })];
    expect(selectAnswerVideo(shared, ["1.1.4"])).toEqual({ video: shared[0], highlighted: true });
  });

  it("skips focus sub-milestones without a video", () => {
    expect(selectAnswerVideo(ar, ["1.1.9", "1.1.3"])?.video.videoId).toBe("ar113");
  });

  it("fallback without a relevant sub-milestone: the milestone's first video (educator), not highlighted", () => {
    expect(selectAnswerVideo([...he].reverse(), [])).toEqual({ video: he[0], highlighted: false });
    expect(selectAnswerVideo(ar, ["9.9.9"])).toEqual({ video: ar[0], highlighted: false });
  });

  it("puts milestone-level videos (no sub-milestone) after sub-milestone videos in the fallback", () => {
    const list = [video("level", null, "educator"), video("he112e", "1.1.2", "educator")];
    expect(selectAnswerVideo(list, [])?.video.videoId).toBe("he112e");
  });

  it("returns null when there is no video in the selected language", () => {
    expect(selectAnswerVideo([], ["1.1.3"])).toBeNull();
  });
});
