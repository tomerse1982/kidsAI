import { CalendarClock, HandHeart, ListChecks, PlayCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityCard, BookmarkButton, MilestoneCard, SourceCard, VideoList } from "@/components/content";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { MILESTONE_CODE } from "@/lib/codes";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import { prisma } from "@/server/db";
import { getMappedVideos, getMilestoneActivities, getMilestoneDetails, listMilestones } from "@/server/knowledge/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const lang = await getLang();
  const m = MILESTONE_CODE.test(code) ? await getMilestoneDetails(prisma, code, lang) : null;
  return { title: m ? `${m.code} ${m.title}` : t(lang).milestones };
}

export default async function MilestonePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!MILESTONE_CODE.test(code)) notFound();
  const lang = await getLang();
  const d = t(lang);
  const m = await getMilestoneDetails(prisma, code, lang);
  if (!m) notFound();
  const [activities, videos, sameAge] = await Promise.all([
    getMilestoneActivities(prisma, code, lang),
    getMappedVideos(prisma, code, { language: lang }),
    listMilestones(prisma, lang, { ageGroup: m.ageGroup.code }),
  ]);
  const remember = m.notes?.split("\n")[0];
  return (
    <article className="space-y-6" data-testid="milestone-page" data-code={m.code}>
      <Link href={`/browse?age=${m.ageGroup.code}`} className="text-sm text-sky-700 hover:underline">← {d.backToBrowse}</Link>
      <MilestoneCard m={m} lang={lang} href={false} />
      <div className="flex justify-end"><BookmarkButton itemType="milestone" itemKey={m.code} lang={lang} /></div>

      {m.missingInLanguage ? <p className="rounded-2xl bg-sky-50 p-3 text-sm text-muted" data-testid="missing-in-language">{d.notCovered}</p> : null}
      {m.explanation ? (
        <Card>
          <SectionTitle icon={<Sparkles size={20} />}>{d.explanation}</SectionTitle>
          <p className="leading-relaxed">{m.explanation}</p>
        </Card>
      ) : null}
      {m.expectedAge ? (
        <Card>
          <SectionTitle icon={<CalendarClock size={20} />}>{d.expectedAge}</SectionTitle>
          <p className="leading-relaxed">{m.expectedAge}</p>
        </Card>
      ) : null}
      {m.guidance ? (
        <Card>
          <SectionTitle icon={<HandHeart size={20} />}>{d.howToHelp}</SectionTitle>
          <p className="leading-relaxed">{m.guidance}</p>
        </Card>
      ) : null}

      <section>
        <SectionTitle icon={<ListChecks size={20} />}>{d.recommendedActivities}</SectionTitle>
        <div className="space-y-3">{activities.map((a) => <ActivityCard key={a.code} a={a} lang={lang} />)}</div>
      </section>

      <section>
        <SectionTitle icon={<PlayCircle size={20} />}>{d.videos}</SectionTitle>
        <VideoList videos={videos} lang={lang} />
      </section>

      {remember ? <Card className="bg-blush-50"><SectionTitle>{d.remember}</SectionTitle><p>{remember}</p></Card> : null}

      <section>
        <SectionTitle>{d.source}</SectionTitle>
        <SourceCard sources={m.sources} lang={lang} />
      </section>

      <section>
        <SectionTitle>{d.moreInAgeGroup}</SectionTitle>
        <ul className="space-y-2">
          {sameAge.filter((x) => x.code !== m.code).map((x) => (
            <li key={x.code}><Link href={`/milestones/${x.code}`} className="block rounded-2xl bg-white px-4 py-3 ring-1 ring-sky-100 hover:bg-sky-50"><bdi dir="ltr" className="me-2 font-mono text-sm text-muted">{x.code}</bdi>{x.title ?? d.noTitleInLanguage}</Link></li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted">{d.disclaimerShort}</p>
    </article>
  );
}
