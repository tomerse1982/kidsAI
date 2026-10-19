import type { Metadata } from "next";
import Link from "next/link";
import { MilestoneCard, VideoCard } from "@/components/content";
import { Card, Code, SectionTitle } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import { prisma } from "@/server/db";
import { getClientId } from "@/server/http";
import { getMappedVideos, listMilestones } from "@/server/knowledge/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await getLang()).bookmarks };
}

export default async function BookmarksPage() {
  const lang = await getLang();
  const d = t(lang);
  const clientId = await getClientId();
  const items = await prisma.bookmark.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  const milestoneCodes = items.filter((i) => i.itemType === "milestone").map((i) => i.itemKey);
  const activityCodes = items.filter((i) => i.itemType === "activity").map((i) => i.itemKey);
  const [milestones, activities] = await Promise.all([
    milestoneCodes.length ? listMilestones(prisma, lang, { codes: milestoneCodes }) : [],
    activityCodes.length
      ? prisma.activity.findMany({ where: { activityCode: { in: activityCodes } }, include: { translations: { where: { language: lang } }, milestone: { select: { milestoneCode: true } } } })
      : [],
  ]);
  const videoKeys = items.filter((i) => i.itemType === "video").map((i) => i.itemKey.replace("youtube:", ""));
  const videoMappings = videoKeys.length ? await prisma.activityVideoMapping.findMany({ where: { video: { providerVideoId: { in: videoKeys } } }, select: { milestone: { select: { milestoneCode: true } } } }) : [];
  const videos = (await Promise.all([...new Set(videoMappings.map((v) => v.milestone.milestoneCode))].map((c) => getMappedVideos(prisma, c, { language: lang }))))
    .flat().filter((v) => videoKeys.includes(v.videoId));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{d.bookmarks}</h1>
      {!items.length ? <Card className="text-muted" data-testid="no-bookmarks">{d.noBookmarks}</Card> : null}
      {milestones.length ? (
        <section data-testid="bookmarked-milestones"><SectionTitle>{d.milestones}</SectionTitle>
          <ul className="space-y-3">{milestones.map((m) => <li key={m.code}><MilestoneCard m={m} lang={lang} /></li>)}</ul>
        </section>
      ) : null}
      {activities.length ? (
        <section><SectionTitle>{d.recommendedActivities}</SectionTitle>
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id}><Link href={`/milestones/${a.milestone.milestoneCode}`} className="block rounded-2xl bg-white px-4 py-3 ring-1 ring-sky-100"><Code className="me-2 text-muted">{a.activityCode}</Code>{a.translations[0]?.title ?? a.activityCode}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}
      {videos.length ? (
        <section><SectionTitle>{d.videos}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">{videos.map((v) => <VideoCard key={v.videoId} video={v} lang={lang} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
