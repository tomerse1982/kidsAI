"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-bold">כניסת מנהלים</h1>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
          });
          setBusy(false);
          if (!res.ok) {
            setError(res.status === 429 ? "יותר מדי ניסיונות. נסו שוב מאוחר יותר." : "דוא״ל או סיסמה שגויים");
            return;
          }
          const next = params.get("next");
          router.push(next && next.startsWith("/admin") ? next : "/admin");
          router.refresh();
        }}
      >
        <label className="block text-sm">דוא״ל
          <input name="email" type="email" required autoComplete="username" dir="ltr" className="mt-1 w-full rounded-xl border border-sky-200 p-2.5" data-testid="admin-email" />
        </label>
        <label className="block text-sm">סיסמה
          <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="mt-1 w-full rounded-xl border border-sky-200 p-2.5" data-testid="admin-password" />
        </label>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full" data-testid="admin-login">כניסה</Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
