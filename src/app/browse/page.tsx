import type { Metadata } from "next";
import Link from "next/link";
import { MilestoneCard } from "@/components/content";
import { cn } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang-server";
import { prisma } from "@/server/db";
import { listAgeGroups, listMilestones } from "@/server/knowledge/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await getLang()).browse };
}

/** Manual browsing — pure database reads, works when the AI service is unavailable. */
export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ age?: string; domain?: string }> }) {
  const lang = await getLang();
  const d = t(lang);
  const { age, domain } = await searchParams;
  const groups = await listAgeGroups(prisma, lang);
  const selected = groups.find((g) => g.code === age) ?? null;
  const all = await listMilestones(prisma, lang, selected ? { ageGroup: selected.code } : {});
  const milestones = domain ? all.filter((m) => m.domain === domain) : all;
  const domains = ["social", "language", "gross_motor", "fine_motor"];
  const q = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { age, domain, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/browse${p.size ? `?${p}` : ""}`;
  };
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{d.milestones}</h1>
      <nav aria-label={d.ageGroups} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          <li><Link href={q({ age: undefined })} className={cn("block whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1", !selected ? "bg-sky-700 text-white ring-sky-700" : "bg-white ring-sky-200")}>{d.allMilestones}</Link></li>
          {groups.map((g) => (
            <li key={g.code}>
              <Link href={q({ age: g.code })} aria-current={selected?.code === g.code ? "page" : undefined} className={cn("block whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1", selected?.code === g.code ? "bg-sky-700 text-white ring-sky-700" : "bg-white ring-sky-200")} data-testid="age-filter">
                {g.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="flex flex-wrap gap-2" aria-label={d.domain}>
        {domains.map((x) => (
          <li key={x}>
            <Link href={q({ domain: domain === x ? undefined : x })} className={cn("block rounded-full px-3 py-1.5 text-xs ring-1", domain === x ? "bg-sage-500 text-white ring-sage-500" : "bg-sage-50 text-sage-700 ring-sage-200")}>{d.domains[x]}</Link>
          </li>
        ))}
      </ul>
      {selected?.sourceText ? <p className="text-sm text-muted">{selected.sourceText}</p> : null}
      <ul className="space-y-3" data-testid="milestone-list">
        {milestones.map((m) => <li key={m.code}><MilestoneCard m={m} lang={lang} /></li>)}
      </ul>
    </div>
  );
}
