import { Card, Code } from "@/components/ui/primitives";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">יומן שינויים</h1>
      <Card>
        <ul className="divide-y divide-sky-50 text-xs" data-testid="audit-list">
          {entries.map((e) => (
            <li key={e.id} className="space-y-1 py-2">
              <div className="flex flex-wrap gap-2">
                <span className="text-muted">{e.createdAt.toISOString().replace("T", " ").slice(0, 19)}</span>
                <Code>{e.action}</Code>
                <span>{e.entityType} {e.entityId ? <Code>{e.entityId.slice(0, 8)}</Code> : null}</span>
                <bdi dir="ltr">{e.actor?.email ?? "system"}</bdi>
              </div>
              {e.reason ? <p>סיבה: {e.reason}</p> : null}
              {e.before || e.after ? <pre dir="ltr" className="whitespace-pre-wrap text-muted">{JSON.stringify({ before: e.before, after: e.after })}</pre> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
