import { Baby, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { AskBox, RecentQuestions, SuggestionChips } from "@/components/ask-box";
import { LadderLogo } from "@/components/shell";
import { SectionTitle } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import { prisma } from "@/server/db";
import { listAgeGroups } from "@/server/knowledge/queries";

export const dynamic = "force-dynamic";

const AGE_TINTS = ["bg-blush-100", "bg-sky-100", "bg-sage-100", "bg-blush-50", "bg-sky-50", "bg-sage-50", "bg-blush-100", "bg-sky-100"];

export default async function Home() {
  const lang = await getLang();
  const d = t(lang);
  const groups = await listAgeGroups(prisma, lang);
  return (
    <div className="space-y-7">
      <section className="flex items-center gap-4 pt-2">
        <LadderLogo size={64} />
        <div>
          <h1 className="text-3xl font-bold leading-tight">{d.appName}</h1>
          <p className="text-muted">{d.tagline}</p>
        </div>
      </section>

      <AskBox lang={lang} />

      <section>
        <SectionTitle icon={<MessageCircleQuestion size={20} />}>{d.suggested}</SectionTitle>
        <SuggestionChips items={d.suggestions} />
      </section>

      <section>
        <SectionTitle icon={<Baby size={20} />}>{d.ageGroups}</SectionTitle>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {groups.map((g, i) => (
            <li key={g.code}>
              <Link href={`/browse?age=${g.code}`} className={`flex min-h-20 flex-col justify-between rounded-2xl p-3 ${AGE_TINTS[i]} ring-1 ring-black/[0.03] hover:brightness-[0.98]`} data-testid="age-shortcut">
                <span className="font-semibold leading-snug">{g.label}</span>
                <span className="text-xs text-muted">{g.milestoneCount} {d.milestones}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <RecentQuestions lang={lang} />

      <p className="rounded-2xl bg-sky-50 p-3 text-center text-xs text-muted">{d.disclaimerShort}</p>
    </div>
  );
}
