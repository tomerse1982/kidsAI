/** Text normalisation for search (never for display: source text is shown verbatim). */

/*
 * Character classes that contain *combining marks* are built from code points at
 * runtime. Written as regex literals, the production minifier emits the marks as raw
 * characters, and canonical reordering of adjacent marks then corrupts the ranges
 * (e.g. [ؐ-ًؚ...] became [ؐ-ً...], which matches every
 * Arabic letter). Do not "simplify" these back into literals.
 */
const cp = (n: number) => String.fromCodePoint(n);
const cls = (ranges: [number, number][]) => new RegExp(`[${ranges.map(([a, b]) => (a === b ? cp(a) : `${cp(a)}-${cp(b)}`)).join("")}]`, "gu");
const ARABIC_DIACRITICS = cls([[0x610, 0x61a], [0x64b, 0x65f], [0x670, 0x670], [0x6d6, 0x6ed]]);
const HEBREW_POINTS = cls([[0x591, 0x5c7]]);
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;

export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(BIDI_CONTROLS, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(HEBREW_POINTS, "")
    .replace(/[״"“”„]/g, '"')
    .replace(/[׳'‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type DetectedLanguage = "he" | "ar" | "unknown";

/** Script-based detection: Hebrew and Arabic scripts do not overlap. */
export function detectLanguage(text: string): DetectedLanguage {
  const he = (text.match(/[א-ת]/g) ?? []).length;
  const ar = (text.match(/[ء-يٱ-ۓ]/g) ?? []).length;
  if (he === 0 && ar === 0) return "unknown";
  return he >= ar ? "he" : "ar";
}

/** Tokens for keyword search: words of 2+ letters, without very common function words. */
const STOP_WORDS = [
  // Hebrew
  "של", "את", "על", "עם", "אני", "הוא", "היא", "זה", "זו", "מה", "איך", "אם", "או", "גם", "כל", "לא", "כן", "יש", "אין",
  "בן", "בת", "שלי", "לי", "לו", "לה", "הם", "הן", "אפשר", "לעשות", "ילד", "ילדה", "תינוק", "תינוקת", "פעוט", "כדי", "אחרי", "לפני",
  "אילו", "איזה", "אנחנו", "שלו", "שלה", "מאוד", "רק", "עוד", "כמו", "יכול", "יכולה", "יכולים", "צריך",
  // Arabic
  "في", "من", "على", "الى", "إلى", "عن", "مع", "ما", "ماذا", "كيف", "هل", "او", "أو", "هذا", "هذه", "ذلك", "التي", "الذي", "كان",
  "طفل", "طفلة", "الطفل", "الرضيع", "عمره", "عمرها", "لا", "نعم", "يمكن", "أن", "ان", "اي", "أي", "انا", "أنا", "هو", "هي",
];
// compared after normalisation, so normalise the list the same way (على -> علي, إلى -> الي)
const STOP = new Set(STOP_WORDS.map((w) => normalizeForSearch(w)));

export function keywordTokens(text: string): string[] {
  return normalizeForSearch(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .slice(0, 24);
}
