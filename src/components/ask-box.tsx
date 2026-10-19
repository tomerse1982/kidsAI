"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Button } from "./ui/primitives";

const RECENT_KEY = "kidsai.recent";

export function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function pushRecent(q: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 6)));
  } catch {
    /* storage unavailable */
  }
}

/** Large question input on the home screen: navigates to the chat with the question. */
export function AskBox({ lang }: { lang: Lang }) {
  const d = t(lang);
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (text: string) => {
    const v = text.trim();
    if (v.length < 2) return;
    router.push(`/chat?q=${encodeURIComponent(v)}`);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(q);
      }}
      className="rounded-[1.5rem] bg-white p-2 shadow-[0_6px_24px_rgba(90,159,212,0.18)] ring-1 ring-sky-100"
    >
      <label htmlFor="ask" className="sr-only">{d.askPlaceholder}</label>
      <textarea
        id="ask"
        data-testid="home-question"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(q);
          }
        }}
        rows={3}
        maxLength={600}
        placeholder={d.askPlaceholder}
        enterKeyHint="send"
        className="w-full resize-none rounded-2xl bg-transparent p-3 text-lg outline-none placeholder:text-muted/70"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <p className="text-xs text-muted">{d.privacyNote}</p>
        <Button type="submit" size="lg" disabled={q.trim().length < 2} data-testid="home-ask">
          <Send size={18} aria-hidden className="rtl:-scale-x-100" /> {d.ask}
        </Button>
      </div>
    </form>
  );
}

export function SuggestionChips({ items }: { items: string[] }) {
  const router = useRouter();
  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => (
        <li key={s}>
          <button
            type="button"
            onClick={() => router.push(`/chat?q=${encodeURIComponent(s)}`)}
            className="w-full rounded-2xl bg-blush-50 px-4 py-3 text-start text-[0.95rem] text-ink ring-1 ring-blush-100 hover:bg-blush-100"
            data-testid="suggestion"
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function RecentQuestions({ lang }: { lang: Lang }) {
  const d = t(lang);
  // localStorage is an external store; the server snapshot is empty
  const raw = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => JSON.stringify(readRecent()),
    () => "[]",
  );
  const items = JSON.parse(raw) as string[];
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{d.recent}</h2>
      <SuggestionChips items={items} />
    </section>
  );
}
