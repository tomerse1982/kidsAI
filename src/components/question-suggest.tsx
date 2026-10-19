"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { t, type Lang } from "@/lib/i18n";
import { bankQuestions, type BankQuestion } from "@/lib/question-bank";
import { buildSuggestIndex, suggest, type Suggestion } from "@/lib/suggest";
import { cn } from "./ui/primitives";

const DEBOUNCE_MS = 250;

/**
 * Autocomplete over the question bank in the selected language, for a free-text question field.
 * Spread `inputProps` on the field and call `onKeyDown` first in its key handler: it returns true
 * when it handled the key (arrows, Enter on a highlighted suggestion, Esc). Otherwise the field
 * keeps its own behaviour, so free search works as before whether or not there are suggestions.
 */
export function useQuestionSuggest({ lang, value, onPick }: { lang: Lang; value: string; onPick: (text: string) => void }) {
  const listId = useId();
  const index = useMemo(() => buildSuggestIndex(bankQuestions(lang)), [lang]);
  const [query, setQuery] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value]);
  const items = useMemo(() => suggest(index, query), [index, query]);

  const [focused, setFocused] = useState(false);
  // highlighted option and Esc are tied to the query they were set for, so typing resets them
  const [nav, setNav] = useState<{ query: string; active: number; dismissed: boolean }>({ query: "", active: -1, dismissed: false });
  const current = nav.query === query ? nav : { query, active: -1, dismissed: false };
  const open = focused && items.length > 0 && !current.dismissed;
  const active = open ? current.active : -1;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (s: Suggestion<BankQuestion>) => {
    setNav({ query, active: -1, dismissed: true });
    onPick(s.text);
  };

  const onKeyDown = (e: KeyboardEvent): boolean => {
    if (!open) return false;
    const n = items.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (active + 1) % n : active <= 0 ? n - 1 : active - 1;
      setNav({ query, active: next, dismissed: false });
      return true;
    }
    if (e.key === "Enter" && !e.shiftKey && active >= 0) {
      e.preventDefault();
      pick(items[active]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setNav({ query, active: -1, dismissed: true });
      return true;
    }
    return false;
  };

  const inputProps = {
    role: "combobox" as const,
    "aria-autocomplete": "list" as const,
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  return { items, open, active, listId, optionId, pick, onKeyDown, inputProps, setActive: (i: number) => setNav({ query, active: i, dismissed: false }) };
}

export function QuestionSuggestList({ lang, s, placement = "below" }: { lang: Lang; s: ReturnType<typeof useQuestionSuggest>; placement?: "below" | "above" }) {
  const d = t(lang);
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">{s.open ? `${s.items.length} ${d.suggestionsAvailable}` : ""}</p>
      <ul
        id={s.listId}
        role="listbox"
        aria-label={d.suggestionsLabel}
        lang={lang}
        dir="rtl"
        hidden={!s.open}
        className={cn(
          "absolute inset-x-0 z-30 max-h-80 overflow-y-auto rounded-2xl bg-white p-1 text-start shadow-[0_6px_24px_rgba(45,49,66,0.16)] ring-1 ring-sky-100",
          placement === "below" ? "top-full mt-1" : "bottom-full mb-1",
        )}
        data-testid="question-suggestions"
      >
        {s.open
          ? s.items.map((item, i) => (
              <li
                key={item.item.id}
                id={s.optionId(i)}
                role="option"
                aria-selected={i === s.active}
                // keep focus in the field so the click registers before blur closes the list
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => s.pick(item)}
                onMouseMove={() => i !== s.active && s.setActive(i)}
                className={cn("cursor-pointer rounded-xl px-3 py-2 text-[0.95rem] leading-snug", i === s.active ? "bg-sky-100" : "hover:bg-sky-50")}
                data-testid="question-suggestion"
              >
                {item.text.slice(0, item.match.start)}
                <mark className="rounded bg-blush-100 px-0.5 font-semibold text-ink">{item.text.slice(item.match.start, item.match.end)}</mark>
                {item.text.slice(item.match.end)}
              </li>
            ))
          : null}
      </ul>
    </>
  );
}
