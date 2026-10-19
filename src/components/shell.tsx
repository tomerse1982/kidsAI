"use client";

import { Bookmark, Home, Languages, LayoutGrid, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { cn } from "./ui/primitives";

export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "he" ? "ar" : "he";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        try {
          if (location.pathname.startsWith("/chat")) sessionStorage.setItem("kidsai.langSwitched", "1");
        } catch {
          /* storage unavailable */
        }
        start(() => router.refresh());
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-medium text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50"
      aria-label={t(lang).switchTo}
      lang={next}
      disabled={pending}
      data-testid="lang-switch"
    >
      <Languages size={18} aria-hidden />
      {t(lang).switchTo}
    </button>
  );
}

export function AppHeader({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <header className="sticky top-0 z-30 border-b border-blush-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2" aria-label={d.appName}>
          <LadderLogo />
          <span className="leading-tight">
            <span className="block text-lg font-bold text-ink">{d.appName}</span>
            <span className="block text-xs text-muted" lang={lang === "he" ? "ar" : "he"} dir="rtl">{d.appNameOther}</span>
          </span>
        </Link>
        <LanguageSwitcher lang={lang} />
      </div>
    </header>
  );
}

export function LadderLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="14" fill="#fde7ee" />
      <path d="M17 38 L21 10 M31 38 L27 10" stroke="#5a9fd4" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19.4 31h10.2M20.3 24h8.4M21.2 17h6.6" stroke="#74a06c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="12" r="4" fill="#e0789a" />
    </svg>
  );
}

export function BottomNav({ lang }: { lang: Lang }) {
  const d = t(lang);
  const path = usePathname();
  const items = [
    { href: "/", label: d.home, icon: Home },
    { href: "/chat", label: d.chat, icon: MessageCircle },
    { href: "/browse", label: d.browse, icon: LayoutGrid },
    { href: "/bookmarks", label: d.bookmarks, icon: Bookmark },
  ];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-100 bg-white/95 backdrop-blur" aria-label="main">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs", active ? "font-semibold text-sky-700" : "text-muted")}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
