"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

async function fetchJob(id: string, filter: string) {
  const res = await fetch(`/api/admin/imports/${id}${filter ? `?action=${filter}` : ""}`);
  return res.ok ? res.json() : null;
}
import { Badge, Button, Card, Code } from "@/components/ui/primitives";

const FIELDS: [string, string][] = [
  ["subMilestone", "תת־אבן דרך *"], ["video", "קישור לסרטון *"], ["milestone", "אבן דרך"], ["originalTitle", "כותרת מקורית"],
  ["correlation", "קורלציה"], ["milestoneNameHe", "שם אבן דרך (עברית)"], ["milestoneNameAr", "שם אבן דרך (ערבית)"],
  ["activityHe", "תת אבן דרך (עברית)"], ["activityAr", "תת אבן דרך (ערבית)"], ["audience", "קהל יעד"], ["age", "גיל"],
];

interface Proposal { sheet: string; headerRow: number; headers: { column: string; header: string }[]; columns: Record<string, string>; confidence: string; unmatchedHeaders: string[] }

function ColumnMapper({ jobId, proposals, onDone }: { jobId: string; proposals: Proposal[]; onDone: (newJob: string) => void }) {
  const [idx, setIdx] = useState(0);
  const p = proposals[idx];
  const [cols, setCols] = useState<Record<string, string>>(p?.columns ?? {});
  const [err, setErr] = useState<string | null>(null);
  if (!p) return <p>לא נמצאו גיליונות עם כותרות.</p>;
  return (
    <Card className="space-y-3" data-testid="column-mapper">
      <h2 className="font-semibold">מיפוי עמודות (מבנה קובץ לא מוכר)</h2>
      <label className="text-sm">גיליון
        <select value={idx} onChange={(e) => { const i = Number(e.target.value); setIdx(i); setCols(proposals[i]?.columns ?? {}); }} className="ms-2 rounded-lg border border-sky-200 p-2">
          {proposals.map((x, i) => <option key={x.sheet} value={i}>{x.sheet} ({x.confidence})</option>)}
        </select>
      </label>
      <p className="text-xs text-muted">שורת כותרת: {p.headerRow}. עמודות שזוהו: {p.headers.map((h) => `${h.column}=${h.header}`).join(" · ")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {FIELDS.map(([f, label]) => (
          <label key={f} className="flex items-center justify-between gap-2 text-sm">{label}
            <select value={cols[f] ?? ""} onChange={(e) => setCols({ ...cols, [f]: e.target.value })} className="w-40 rounded-lg border border-sky-200 p-1.5" dir="ltr" data-testid={`col-${f}`}>
              <option value="">—</option>
              {p.headers.map((h) => <option key={h.column} value={h.column}>{h.column}: {h.header.slice(0, 24)}</option>)}
            </select>
          </label>
        ))}
      </div>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <Button
        data-testid="confirm-mapping"
        onClick={async () => {
          const columns = Object.fromEntries(Object.entries(cols).filter(([, v]) => v));
          const res = await fetch(`/api/admin/imports/${jobId}/profile`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheet: p.sheet, headerRow: p.headerRow, columns }) });
          const body = await res.json();
          if (!res.ok) { setErr(body.error?.issues?.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join("; ") ?? body.error?.message); return; }
          onDone(body.jobId);
        }}
      >אישור מיפוי ויצירת תצוגה מקדימה</Button>
    </Card>
  );
}

export default function ImportJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<string>("");
  const [confirm, setConfirm] = useState(false);
  const [deactivate, setDeactivate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => fetchJob(id, filter).then((d) => d && setData(d)), [id, filter]);
  useEffect(() => {
    let alive = true;
    fetchJob(id, filter).then((d) => alive && d && setData(d));
    return () => { alive = false; };
  }, [id, filter]);
  useEffect(() => {
    const s = data?.job?.status;
    if (!["queued", "parsing", "validated", "publishing"].includes(s)) return;
    const timer = setInterval(load, 3000); // async job: poll status
    return () => clearInterval(timer);
  }, [data?.job?.status, load]);
  if (!data) return <p>טוען…</p>;
  const { job, rowCounts, rows, issues } = data;
  const stats = job.stats ?? {};
  const proposals: Proposal[] | undefined = stats.proposals;
  return (
    <div className="space-y-4" data-testid="import-job" data-status={job.status}>
      <h1 className="text-xl font-bold">{job.originalFilename}</h1>
      <Card className="flex flex-wrap gap-2 text-sm">
        <Badge tone={job.status === "published" ? "sage" : job.status === "failed" ? "pink" : "amber"} data-testid="job-status">{job.status}</Badge>
        <span>{job.jobType} · שפה: {job.language}</span>
        <span className="text-muted">checksum <Code>{job.checksum.slice(0, 12)}</Code></span>
        {job.errorMessage ? <span className="text-red-700">{job.errorMessage}</span> : null}
      </Card>

      {job.status === "queued" && proposals ? <ColumnMapper jobId={id} proposals={proposals} onDone={(nid) => router.push(`/admin/imports/${nid}`)} /> : null}

      {job.jobType === "video_workbook" && rowCounts.length ? (
        <Card>
          <h2 className="mb-2 font-semibold">תצוגה מקדימה</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {rowCounts.map((c: { action: string; status: string; _count: number }) => (
              <button key={`${c.action}${c.status}`} onClick={() => setFilter(filter === c.action ? "" : c.action)} className="rounded-full bg-sky-50 px-3 py-1" data-testid={`count-${c.action}`}>
                {c.action}/{c.status}: <b>{c._count}</b>
              </button>
            ))}
          </div>
          {stats.missingMappings?.length ? <p className="mt-2 text-xs text-muted">תתי־אבני דרך ללא סרטון: {stats.missingMappings.length}</p> : null}
          <div className="mt-3 max-h-96 overflow-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-sky-50"><tr><th className="p-1 text-start">שורה</th><th className="p-1 text-start">קוד</th><th className="p-1 text-start">סרטון</th><th className="p-1 text-start">פעולה</th><th className="p-1 text-start">אמינות</th><th className="p-1 text-start">הערות</th></tr></thead>
              <tbody>
                {rows.map((r: { id: string; worksheet: string; rowNumber: number; action: string; status: string; normalized: { subMilestoneCode: string; videoId: string; confidence: string }; messages: string[] }) => (
                  <tr key={r.id} className="border-t border-sky-50">
                    <td className="p-1"><Code>{r.worksheet}!{r.rowNumber}</Code></td>
                    <td className="p-1"><Code>{r.normalized?.subMilestoneCode}</Code></td>
                    <td className="p-1"><Code>{r.normalized?.videoId ?? "—"}</Code></td>
                    <td className="p-1">{r.action} / {r.status}</td>
                    <td className="p-1">{r.normalized?.confidence}</td>
                    <td className="p-1">{r.messages?.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {job.jobType === "pdf_handbook" && stats.preview ? (
        <Card className="text-sm">
          <h2 className="mb-2 font-semibold">תצוגה מקדימה של החוברת</h2>
          <pre dir="ltr" className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(stats.preview, null, 1)}</pre>
        </Card>
      ) : null}

      {job.status === "staged" ? (
        <Card className="space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deactivate} onChange={(e) => setDeactivate(e.target.checked)} /> השבתת (לא מחיקה) סרטונים קודמים של תתי־אבני דרך שהסרטון שלהן הוחלף</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-testid="confirm-publish" /> בדקתי את התצוגה המקדימה ואת הבעיות, ואני מאשר/ת פרסום</label>
          <Button
            disabled={!confirm}
            data-testid="publish"
            onClick={async () => {
              const res = await fetch(`/api/admin/imports/${id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true, deactivateReplaced: deactivate }) });
              const body = await res.json();
              setMsg(res.ok ? "אושר — הפרסום רץ ברקע" : body.error?.message);
              void load();
            }}
          >פרסום</Button>
          {msg ? <p className="text-sm">{msg}</p> : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-semibold">בעיות ({issues.length})</h2>
        <ul className="max-h-96 space-y-1 overflow-auto text-xs">
          {issues.map((i: { id: string; severity: string; code: string; message: string; worksheet: string | null; rowNumber: number | null; pageIndex: number | null }) => (
            <li key={i.id} className="flex gap-2">
              <Badge tone={i.severity === "error" || i.severity === "critical" ? "pink" : i.severity === "warning" ? "amber" : "gray"}>{i.severity}</Badge>
              <span><Code>{i.code}</Code> {i.worksheet ? `${i.worksheet}!${i.rowNumber ?? ""}` : i.pageIndex !== null ? `p.${i.pageIndex}` : ""} — {i.message}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
