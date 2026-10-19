"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Code } from "@/components/ui/primitives";

interface Queue {
  links: { total: number; items: { id: string; milestone: string; score: number | null; segment: { code: string; he: string | null; ar: string | null }; exercise: { code: string; he: string | null; ar: string | null } }[] };
  translations: { id: string; milestone: string; language: "he" | "ar"; title: string; explanation: string | null; expectedAge: string | null }[];
  mappings: { id: string; code: string | null; videoId: string; confidence: string; workbookTitle: string | null; youtubeTitle: string | null; sheet: string; row: number }[];
}

async function fetchQueue(): Promise<Queue | null> {
  const r = await fetch("/api/admin/review");
  return r.ok ? r.json() : null;
}

export default function ReviewPage() {
  const [q, setQ] = useState<Queue | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = useCallback(() => fetchQueue().then((d) => d && setQ(d)), []);
  useEffect(() => {
    let alive = true;
    fetchQueue().then((d) => alive && d && setQ(d));
    return () => { alive = false; };
  }, []);

  const decide = async (kind: "link" | "translation", id: string, decision: "approve" | "reject") => {
    const reason = prompt(decision === "approve" ? "סיבת האישור:" : "סיבת הדחייה:");
    if (!reason || reason.trim().length < 3) return;
    const res = await fetch("/api/admin/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, decision, reason }) });
    setMsg(res.ok ? "נשמר ונרשם ביומן השינויים" : res.status === 403 ? "נדרשת הרשאת עורך" : "שגיאה");
    void reload();
  };

  if (!q) return <p>טוען…</p>;
  return (
    <div className="space-y-4" data-testid="review-page">
      <h1 className="text-xl font-bold">תור בדיקה</h1>
      {msg ? <p className="rounded-xl bg-sage-50 p-2 text-sm">{msg}</p> : null}

      <Card>
        <h2 className="mb-1 font-semibold">טקסטים מהחוברת שסומנו לבדיקה ({q.translations.length})</h2>
        <p className="mb-3 text-xs text-muted">למשל פסקת מבוא שהועתקה מאבן דרך אחרת. אישור: הטקסט ישמש כתקציר. דחייה: הטקסט נשמר כפי שהוא במקור אך לא מוצג כהסבר.</p>
        <ul className="space-y-3" data-testid="review-translations">
          {q.translations.map((t) => (
            <li key={t.id} className="rounded-xl bg-sky-50 p-3 text-sm" lang={t.language}>
              <div className="mb-1 flex flex-wrap items-center gap-2"><Code>{t.milestone}</Code><Badge tone="gray">{t.language}</Badge><b>{t.title}</b></div>
              <p><span className="text-muted">מבוא: </span>{t.explanation}</p>
              {t.expectedAge ? <p className="mt-1"><span className="text-muted">מתי זה קורה: </span>{t.expectedAge}</p> : null}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="sage" onClick={() => decide("translation", t.id, "approve")}>אישור</Button>
                <Button size="sm" variant="danger" onClick={() => decide("translation", t.id, "reject")}>דחייה</Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">מיפויי סרטונים לבדיקה ({q.mappings.length})</h2>
        <ul className="space-y-1 text-sm">
          {q.mappings.map((m) => (
            <li key={m.id} className="flex flex-wrap gap-2">
              <Link href="/admin/mappings" className="text-sky-700 hover:underline"><Code>{m.code}</Code></Link>
              <Code>{m.videoId}</Code><Badge tone="amber">{m.confidence}</Badge>
              <span className="text-muted">{m.sheet}!{m.row} · D: {m.workbookTitle ?? "—"} · YouTube: {m.youtubeTitle ?? "—"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">קישורי סרטון ↔ פעילות בחוברת ({q.links.total})</h2>
        <p className="mb-3 text-xs text-muted">קישורים שנגזרו אוטומטית מדמיון כותרות ואינם ודאיים. אישור מציג את הסרטון ליד הפעילות; דחייה מונעת קישור זה גם בייבואים הבאים.</p>
        <ul className="space-y-2" data-testid="review-links">
          {q.links.items.map((l) => (
            <li key={l.id} className="grid gap-2 rounded-xl bg-blush-50 p-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
              <div><span className="text-muted">סרטון </span><Code>{l.segment.code}</Code><div>{l.segment.he}</div><div lang="ar" className="text-muted">{l.segment.ar}</div></div>
              <div><span className="text-muted">פעילות </span><Code>{l.exercise.code}</Code><div>{l.exercise.he}</div><div lang="ar" className="text-muted">{l.exercise.ar}</div></div>
              <div className="flex flex-col items-start gap-1">
                <Badge tone="gray">{l.score?.toFixed(3)}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="sage" onClick={() => decide("link", l.id, "approve")}>אישור</Button>
                  <Button size="sm" variant="danger" onClick={() => decide("link", l.id, "reject")}>דחייה</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {q.links.total > q.links.items.length ? <p className="mt-2 text-xs text-muted">מוצגים {q.links.items.length} הראשונים לפי ציון.</p> : null}
      </Card>
    </div>
  );
}
