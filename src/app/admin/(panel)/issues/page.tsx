import { Badge, Card, Code } from "@/components/ui/primitives";
import { ResolveIssueButton } from "@/components/admin/resolve-issue";
import { listIssues } from "@/server/admin/service";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ severity?: string; code?: string; resolved?: string }> }) {
  const sp = await searchParams;
  const severity = ["info", "warning", "error", "critical"].includes(sp.severity ?? "") ? sp.severity : undefined;
  const code = /^[a-z_]{3,60}$/.test(sp.code ?? "") ? sp.code : undefined;
  const [issues, summary] = await Promise.all([
    listIssues(prisma, { severity, code, resolved: sp.resolved === "true" ? true : false, take: 300 }),
    prisma.importIssue.groupBy({ by: ["code", "severity"], where: { isResolved: false }, _count: true, orderBy: { _count: { code: "desc" } } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">בעיות ייבוא</h1>
      <Card className="flex flex-wrap gap-2 text-xs">
        {summary.map((s) => (
          <a key={`${s.code}${s.severity}`} href={`/admin/issues?code=${s.code}`} className="rounded-full bg-sky-50 px-3 py-1 hover:bg-sky-100">
            <Code>{s.code}</Code> ({s.severity}) · <b>{s._count}</b>
          </a>
        ))}
      </Card>
      <Card>
        <ul className="divide-y divide-sky-50 text-sm" data-testid="issue-list">
          {issues.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge tone={i.severity === "error" || i.severity === "critical" ? "pink" : i.severity === "warning" ? "amber" : "gray"}>{i.severity}</Badge>
                  <Code>{i.code}</Code>
                  <span className="text-xs text-muted">{i.sourceFile}{i.worksheet ? ` · ${i.worksheet}` : ""}{i.rowNumber ? ` · שורה ${i.rowNumber}` : ""}{i.pageIndex !== null ? ` · עמוד PDF ${i.pageIndex + 1}` : ""}</span>
                </div>
                <p>{i.message}</p>
              </div>
              <ResolveIssueButton id={i.id} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
