import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { contentOverview } from "@/server/admin/service";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

function Stat({ label, value, tone = "bg-sky-50", href }: { label: string; value: number | string; tone?: string; href?: string }) {
  const body = (
    <div className={`rounded-2xl p-3 ${tone}`} data-testid="stat">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminOverview() {
  const o = await contentOverview(prisma);
  const issues = o.unresolvedIssues as Record<string, number>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">סקירת תוכן</h1>
      <Card className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="אבני דרך" value={o.milestones} />
        <Stat label="תתי־אבני דרך (מקטעי וידאו)" value={o.subMilestones} />
        <Stat label="פעילויות מהחוברות" value={o.exercises} />
        <Stat label="מיפויים פעילים" value={o.mappings.active} tone="bg-sage-50" />
        <Stat label="קטעי חוברת בעברית" value={o.handbookSections.he} tone="bg-blush-50" />
        <Stat label="קטעי חוברת בערבית" value={o.handbookSections.ar} tone="bg-blush-50" />
        <Stat label="סרטונים בערבית" value={o.videos.ar} tone="bg-sage-50" />
        <Stat label="סרטונים בעברית" value={o.videos.he} tone="bg-sage-50" />
        <Stat label="אבני דרך ללא סרטון" value={o.missing.milestonesWithoutVideo} tone="bg-amber-50" href="/admin/issues?code=missing_video_mapping" />
        <Stat label="תתי־אבני דרך ללא סרטון" value={o.missing.subMilestonesWithoutVideo} tone="bg-amber-50" href="/admin/issues?code=missing_video_mapping" />
        <Stat label="שיוכים עמומים (לבדיקה)" value={o.ambiguous.segmentExerciseLinks + o.ambiguous.mappings} tone="bg-amber-50" />
        <Stat label="שגיאות ייבוא פתוחות" value={(issues.error ?? 0) + (issues.critical ?? 0)} tone="bg-red-50" href="/admin/issues?severity=error" />
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">ייבואים אחרונים</h2>
        <ul className="divide-y divide-sky-50 text-sm">
          {o.recentJobs.map((j) => (
            <li key={j.id} className="flex flex-wrap justify-between gap-2 py-2">
              <Link href={`/admin/imports/${j.id}`} className="text-sky-700 hover:underline">{j.originalFilename}</Link>
              <span className="text-muted">{j.jobType} · {j.language ?? "-"} · {j.status} · {j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
