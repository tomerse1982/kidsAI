"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui/primitives";

interface Job { id: string; jobType: string; status: string; language: string | null; originalFilename: string; createdAt: string; errorMessage: string | null; _count: { issues: number } }

export default function ImportsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/imports").then((r) => r.json()).then((j) => alive && setJobs(j));
    return () => { alive = false; };
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">ייבוא קבצים</h1>
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(null);
            const res = await fetch("/api/admin/imports", { method: "POST", body: new FormData(e.currentTarget) });
            const body = await res.json();
            setBusy(false);
            if (!res.ok) { setMsg(body.error?.message ?? "שגיאה"); return; }
            router.push(`/admin/imports/${body.jobId}`);
          }}
        >
          <label className="text-sm">סוג קובץ
            <select name="kind" className="mt-1 w-full rounded-xl border border-sky-200 p-2.5" data-testid="import-kind">
              <option value="video_workbook">טבלת סרטונים (Excel)</option>
              <option value="handbook_pdf">חוברת הדרכה (PDF)</option>
            </select>
          </label>
          <label className="text-sm">שפה
            <select name="language" className="mt-1 w-full rounded-xl border border-sky-200 p-2.5" data-testid="import-language">
              <option value="he">עברית</option>
              <option value="ar">ערבית</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">קובץ
            <input name="file" type="file" required accept=".xlsx,.pdf" className="mt-1 w-full rounded-xl border border-sky-200 p-2" data-testid="import-file" />
          </label>
          <div className="sm:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={busy} data-testid="import-submit">{busy ? "מעבד…" : "העלאה לתצוגה מקדימה"}</Button>
            <p className="text-xs text-muted">שום דבר לא מתפרסם לפני אישור מנהל. מיפויים קיימים לעולם אינם נמחקים אוטומטית.</p>
          </div>
          {msg ? <p className="sm:col-span-4 text-sm text-red-700">{msg}</p> : null}
        </form>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">היסטוריית ייבוא</h2>
        <ul className="divide-y divide-sky-50 text-sm">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link href={`/admin/imports/${j.id}`} className="text-sky-700 hover:underline">{j.originalFilename}</Link>
              <span className="flex items-center gap-2 text-xs text-muted">
                {j.jobType} · {j.language} · {new Date(j.createdAt).toLocaleString("he-IL")}
                <Badge tone={j.status === "published" ? "sage" : j.status === "failed" ? "pink" : "amber"}>{j.status}</Badge>
                {j._count.issues} בעיות
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
