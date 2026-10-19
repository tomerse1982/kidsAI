"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Code } from "@/components/ui/primitives";

interface MappingRow {
  id: string; language: "he" | "ar" | "unknown"; isActive: boolean; mappingType: string; confidence: string;
  videoId: string; url: string; embedUrl: string; availability: string;
  source: { document: string; documentKey: string; sheet: string; row: number };
  raw: { milestone: string | null; subMilestone: string | null; correlation: string | null; video: string | null };
  validation: { check: string; result: string; detail?: string }[];
}
interface Row {
  activityId: string; code: string; role: string; audience: string; titleHe: string | null; titleAr: string | null;
  links: { exercise: string; type: string; score: number | null }[]; mappings: MappingRow[];
}
interface Data { milestone: { code: string; titleHe: string | null; titleAr: string | null; domain: string | null; ageGroup: string }; rows: Row[] }

function VideoCell({ maps, onChange }: { maps: MappingRow[]; onChange: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!maps.length) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="space-y-2">
      {maps.map((m) => (
        <div key={m.id} className={m.isActive ? "" : "opacity-50"} data-testid="admin-mapping" data-video-id={m.videoId}>
          <div className="flex flex-wrap items-center gap-1">
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline"><Code>{m.videoId}</Code></a>
            <Badge tone={m.confidence === "verified" ? "sage" : m.confidence === "conflict" ? "pink" : "amber"}>{m.confidence}</Badge>
            {!m.isActive ? <Badge tone="gray">inactive</Badge> : null}
          </div>
          <div className="text-[11px] text-muted">{m.source.sheet} · שורה <Code>{m.source.row}</Code> · E: {m.raw.correlation ?? "—"}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Button size="sm" variant="soft" onClick={() => setPreview(preview === m.videoId ? null : m.videoId)}>תצוגה</Button>
            <Button size="sm" variant={m.isActive ? "danger" : "sage"} onClick={async () => {
              const reason = prompt(m.isActive ? "סיבת השבתה:" : "סיבת הפעלה:");
              if (!reason) return;
              await fetch(`/api/admin/mappings/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !m.isActive, reason }) });
              onChange();
            }}>{m.isActive ? "השבתה" : "הפעלה"}</Button>
            <Button size="sm" variant="pink" onClick={async () => {
              const reason = prompt("מה שגוי ברשומה?");
              if (!reason) return;
              await fetch(`/api/admin/mappings/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confidenceStatus: "needs_review", reason }) });
              onChange();
            }}>סימון לבדיקה</Button>
          </div>
          {preview === m.videoId ? (
            <iframe className="mt-2 aspect-video w-64 rounded-lg" src={m.embedUrl} title={m.videoId} allow="encrypted-media; picture-in-picture" allowFullScreen />
          ) : null}
          <details className="mt-1 text-[11px] text-muted"><summary>ערכי מקור ובדיקות</summary>
            <pre dir="ltr" className="whitespace-pre-wrap">{JSON.stringify({ raw: m.raw, validation: m.validation }, null, 1)}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}

export default function MappingsPage() {
  const [code, setCode] = useState("1.1");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (c: string) => {
    setError(null);
    const res = await fetch(`/api/admin/mappings?code=${encodeURIComponent(c)}`);
    if (!res.ok) { setData(null); setError(res.status === 404 ? "אבן דרך לא נמצאה" : "שגיאה בטעינה"); return; }
    setData(await res.json());
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/mappings?code=1.1").then((r) => (r.ok ? r.json() : null)).then((d) => alive && d && setData(d));
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">מיפוי סרטונים</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(code.trim()); }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" placeholder="1.1" className="w-32 rounded-xl border border-sky-200 p-2.5" data-testid="mapping-search" aria-label="milestone code" />
        <Button type="submit" data-testid="mapping-search-submit">חיפוש</Button>
      </form>
      {error ? <p className="text-red-700">{error}</p> : null}
      {data ? (
        <Card className="overflow-x-auto p-0">
          <div className="p-3">
            <h2 className="font-semibold"><Code>{data.milestone.code}</Code> · {data.milestone.titleHe} · <span lang="ar">{data.milestone.titleAr}</span></h2>
            <p className="text-xs text-muted">{data.milestone.ageGroup} · {data.milestone.domain ?? "ללא תחום"}</p>
          </div>
          <table className="w-full min-w-[900px] text-sm" data-testid="mapping-table">
            <thead className="bg-sky-50 text-start text-xs">
              <tr>
                <th className="p-2 text-start">אבן דרך</th><th className="p-2 text-start">תת־אבן דרך</th><th className="p-2 text-start">כותרת בעברית</th>
                <th className="p-2 text-start">כותרת בערבית</th><th className="p-2 text-start">סרטון בערבית</th><th className="p-2 text-start">סרטון בעברית</th><th className="p-2 text-start">סטטוס / שורת מקור</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.code} className="border-t border-sky-50 align-top" data-testid="mapping-row" data-code={r.code}>
                  <td className="p-2"><Code>{data.milestone.code}</Code></td>
                  <td className="p-2"><Code>{r.code}</Code><div className="text-[11px] text-muted">{r.role}</div></td>
                  <td className="p-2">{r.titleHe}</td>
                  <td className="p-2" lang="ar">{r.titleAr}</td>
                  <td className="p-2"><VideoCell maps={r.mappings.filter((m) => m.language === "ar")} onChange={() => load(data.milestone.code)} /></td>
                  <td className="p-2"><VideoCell maps={r.mappings.filter((m) => m.language === "he")} onChange={() => load(data.milestone.code)} /></td>
                  <td className="p-2 text-[11px] text-muted">
                    {r.mappings.map((m) => <div key={m.id}>{m.mappingType} · {m.source.sheet}!{m.source.row}</div>)}
                    {r.links.length ? <div className="mt-1">קישור לפעילות: {r.links.map((l) => `${l.exercise} (${l.type}${l.score ? ` ${l.score.toFixed(2)}` : ""})`).join(", ")}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddMapping onDone={() => load(data.milestone.code)} codes={data.rows.map((r) => r.code)} />
        </Card>
      ) : null}
    </div>
  );
}

function AddMapping({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-2 border-t border-sky-50 p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/admin/mappings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityCode: fd.get("code"), video: fd.get("video"), language: fd.get("language"), reason: fd.get("reason") }),
        });
        const body = await res.json();
        setMsg(res.ok ? `נוסף: ${body.mappingKey}` : body.error?.message ?? "שגיאה");
        if (res.ok) onDone();
      }}
    >
      <span className="w-full font-semibold">הוספת קשר סרטון ידני</span>
      <select name="code" className="rounded-lg border border-sky-200 p-2" dir="ltr">{codes.map((c) => <option key={c}>{c}</option>)}</select>
      <input name="video" required placeholder="https://youtu.be/…" dir="ltr" className="rounded-lg border border-sky-200 p-2" />
      <select name="language" className="rounded-lg border border-sky-200 p-2"><option value="he">עברית</option><option value="ar">ערבית</option></select>
      <input name="reason" required minLength={3} placeholder="סיבה" className="rounded-lg border border-sky-200 p-2" />
      <Button type="submit" size="sm">הוספה</Button>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </form>
  );
}
