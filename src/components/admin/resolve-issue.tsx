"use client";

import { useRouter } from "next/navigation";

export function ResolveIssueButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-full bg-sage-100 px-3 py-1 text-xs text-sage-700"
      onClick={async () => {
        const note = prompt("הערת סגירה (מה נבדק / הוחלט):");
        if (!note || note.trim().length < 3) return;
        await fetch(`/api/admin/issues/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
        router.refresh();
      }}
    >
      סגירה
    </button>
  );
}
