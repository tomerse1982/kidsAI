/**
 * Question autocomplete: normalisation + filtering of the question bank (client side).
 *
 * Separate from normalizeForSearch (used by retrieval) on purpose: it also folds ة -> ه and
 * Hebrew final letters, turns punctuation into spaces, and keeps a map back to the original
 * text so the matched part can be highlighted in the text as displayed (with its marks).
 */

const cp = (n: number) => String.fromCodePoint(n);
// built from code points, see the note in text-normalize.ts
const MARKS = new RegExp(`[${cp(0x591)}-${cp(0x5bd)}${cp(0x5bf)}${cp(0x5c1)}${cp(0x5c2)}${cp(0x5c4)}${cp(0x5c5)}${cp(0x5c7)}${cp(0x610)}-${cp(0x61a)}${cp(0x64b)}-${cp(0x65f)}${cp(0x670)}${cp(0x6d6)}-${cp(0x6ed)}ـ]`, "u");
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/u;
const SEPARATOR = /[\s\p{P}\p{S}]/u;
const LETTERS: Record<string, string> = {
  // Arabic letter variants
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي",
  // Hebrew final forms
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};

export interface NormalizedText {
  /** Normalised text: no niqqud / harakat, unified letter variants, punctuation as spaces, single spaces, trimmed. */
  text: string;
  /** map[i] = index in the original string of normalised character i. */
  map: number[];
}

export function normalizeForMatch(input: string): NormalizedText {
  let text = "";
  const map: number[] = [];
  let spaceAt = -1; // index of the separator run before the next letter
  for (let i = 0; i < input.length; ) {
    const ch = String.fromCodePoint(input.codePointAt(i)!);
    const at = i;
    i += ch.length;
    if (MARKS.test(ch) || BIDI_CONTROLS.test(ch)) continue;
    if (SEPARATOR.test(ch)) {
      if (text.length > 0 && spaceAt < 0) spaceAt = at;
      continue;
    }
    if (spaceAt >= 0) {
      text += " ";
      map.push(spaceAt);
      spaceAt = -1;
    }
    for (const c of ch.normalize("NFKC").toLowerCase()) {
      const out = LETTERS[c] ?? c;
      if (MARKS.test(out)) continue;
      text += out;
      map.push(at);
    }
  }
  return { text, map };
}

/** Characters of the original that the normaliser drops (marks), so a highlight can include them. */
const isDropped = (ch: string) => MARKS.test(ch) || BIDI_CONTROLS.test(ch);

export interface Suggestion<T> {
  item: T;
  text: string;
  /** Matched range in `text` (original string indices, end exclusive). */
  match: { start: number; end: number };
}

export const MIN_QUERY_LENGTH = 2;
export const MAX_SUGGESTIONS = 8;

export interface Suggestible {
  text: string;
}

export type SuggestIndex<T> = { item: T; norm: NormalizedText }[];

/** Precomputes the normalised form of each entry (do once per language). */
export function buildSuggestIndex<T extends Suggestible>(items: T[]): SuggestIndex<T> {
  return items.map((item) => ({ item, norm: normalizeForMatch(item.text) }));
}

/**
 * Entries that contain the query anywhere (also mid-sentence), after normalisation.
 * Order: entries that start with the query, then matches at a word start, then inside a word;
 * then earlier match position; then bank order. At most `limit` entries; [] below 2 characters.
 */
export function suggest<T extends Suggestible>(index: SuggestIndex<T>, query: string, limit = MAX_SUGGESTIONS): Suggestion<T>[] {
  const q = normalizeForMatch(query).text;
  if (q.length < MIN_QUERY_LENGTH) return [];
  const hits: { s: Suggestion<T>; rank: number; pos: number; order: number }[] = [];
  index.forEach(({ item, norm }, order) => {
    const pos = norm.text.indexOf(q);
    if (pos < 0) return;
    const rank = pos === 0 ? 0 : norm.text[pos - 1] === " " ? 1 : 2;
    const start = norm.map[pos];
    let end = norm.map[pos + q.length - 1] + String.fromCodePoint(item.text.codePointAt(norm.map[pos + q.length - 1])!).length;
    while (end < item.text.length && isDropped(item.text[end])) end++;
    hits.push({ s: { item, text: item.text, match: { start, end } }, rank, pos, order });
  });
  return hits
    .sort((a, b) => a.rank - b.rank || a.pos - b.pos || a.order - b.order)
    .slice(0, limit)
    .map((h) => h.s);
}
