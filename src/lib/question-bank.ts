/**
 * Curated question bank (src/data/question-bank.json): educator questions per milestone,
 * written separately in Hebrew and Arabic. Static data, safe to import on the client.
 */
import bank from "@/data/question-bank.json";
import type { Lang } from "./i18n";

export interface BankQuestion {
  id: string;
  lang: Lang;
  milestoneCode: string;
  text: string;
}

const LANGS: Lang[] = ["he", "ar"];

const ALL: BankQuestion[] = LANGS.flatMap((lang) =>
  Object.entries(bank[lang] as Record<string, string[]>).flatMap(([milestoneCode, texts]) =>
    texts.map((text, i) => ({ id: `${lang}-${milestoneCode}-${i + 1}`, lang, milestoneCode, text })),
  ),
);

/** Questions in the selected language only (never mixed with the other language). */
export function bankQuestions(lang: Lang): BankQuestion[] {
  return ALL.filter((q) => q.lang === lang);
}
