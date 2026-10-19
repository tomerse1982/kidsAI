import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout";
import { getAdminSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "סקירה" },
  { href: "/admin/mappings", label: "מיפוי סרטונים" },
  { href: "/admin/imports", label: "ייבוא קבצים" },
  { href: "/admin/review", label: "תור בדיקה" },
  { href: "/admin/issues", label: "בעיות ייבוא" },
  { href: "/admin/audit", label: "יומן שינויים" },
];

/** Server-side guard: every admin page requires a valid session (proxy.ts only redirects optimistically). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="space-y-4" data-testid="admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 ring-1 ring-sky-100">
        <nav className="flex flex-wrap gap-1" aria-label="admin">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs text-muted">
          <bdi dir="ltr">{session.email}</bdi> · {session.role}
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
