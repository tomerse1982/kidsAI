/**
 * Extracts a child's age from a Hebrew or Arabic question and normalises it to
 * months. The original phrase is returned unchanged for display; nothing about
 * the handbook's own age wording is altered.
 */
export interface ParsedAge {
  months: number;
  /** The matched phrase, verbatim. */
  text: string;
  approximate: boolean;
  /** Range in months when the user gave one ("בין שנה לשנתיים"). */
  range?: [number, number];
}

const HE_NUM: Record<string, number> = {
  "אחד": 1, "אחת": 1, "שניים": 2, "שתיים": 2, "שני": 2, "שתי": 2, "שלוש": 3, "שלושה": 3, "ארבע": 4, "ארבעה": 4,
  "חמש": 5, "חמישה": 5, "שש": 6, "שישה": 6, "שבע": 7, "שבעה": 7, "שמונה": 8, "תשע": 9, "תשעה": 9, "עשר": 10, "עשרה": 10,
  "אחת עשרה": 11, "אחד עשר": 11, "שתים עשרה": 12, "שנים עשר": 12, "חצי": 0.5,
};
const AR_NUM: Record<string, number> = {
  "واحد": 1, "واحدة": 1, "اثنان": 2, "اثنين": 2, "ثلاث": 3, "ثلاثة": 3, "أربع": 4, "أربعة": 4, "اربع": 4, "اربعة": 4,
  "خمس": 5, "خمسة": 5, "ست": 6, "ستة": 6, "سبع": 7, "سبعة": 7, "ثمان": 8, "ثمانية": 8, "تسع": 9, "تسعة": 9,
  "عشر": 10, "عشرة": 10, "احدى عشر": 11, "أحد عشر": 11, "اثنا عشر": 12, "اثني عشر": 12, "نصف": 0.5,
};

const APPROX = /(בערך|כמעט|כ-|קרוב ל|בסביבות|تقريبا|تقريباً|حوالي|نحو|قرابة)/;

function toAsciiDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function num(token: string, table: Record<string, number>): number | null {
  const t = token.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return table[t] ?? null;
}

const HE_NUM_WORDS = Object.keys(HE_NUM).sort((a, b) => b.length - a.length).join("|");
const AR_NUM_WORDS = Object.keys(AR_NUM).sort((a, b) => b.length - a.length).join("|");

interface Rule { re: RegExp; months: (m: RegExpExecArray) => number | null }

const RULES: Rule[] = [
  // ---------- Hebrew ----------
  { re: /שנתיים\s*וחצי/, months: () => 30 },
  { re: /שנה\s*וחצי/, months: () => 18 },
  { re: new RegExp(`(\\d+|${HE_NUM_WORDS})\\s*שנים\\s*וחצי`), months: (m) => (num(m[1], HE_NUM) ?? NaN) * 12 + 6 },
  { re: new RegExp(`(?:שנה|שנתיים|(\\d+|${HE_NUM_WORDS})\\s*שנים)\\s*ו-?\\s*(\\d+|${HE_NUM_WORDS})\\s*חודשים`), months: (m) => {
      const years = m[0].startsWith("שנתיים") ? 2 : m[0].startsWith("שנה") ? 1 : num(m[1], HE_NUM);
      const mo = num(m[2], HE_NUM);
      return years === null || mo === null ? null : years * 12 + mo;
    } },
  { re: /חצי\s*שנה/, months: () => 6 },
  { re: /(?:בן|בת|גיל)\s*שנתיים/, months: () => 24 },
  { re: /שנתיים/, months: () => 24 },
  { re: /(?:בן|בת|גיל)\s*שנה(?!\s*ו)/, months: () => 12 },
  { re: /חודשיים/, months: () => 2 },
  { re: /שבועיים/, months: () => 0.5 },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${HE_NUM_WORDS})\\s*(?:שבועות|שבוע)`), months: (m) => { const n = num(m[1], HE_NUM); return n === null ? null : (n * 7) / 30.4375; } },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${HE_NUM_WORDS})\\s*(?:חודשים|חודש|ח')`), months: (m) => num(m[1], HE_NUM) },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${HE_NUM_WORDS})\\s*(?:שנים|שנה)`), months: (m) => { const n = num(m[1], HE_NUM); return n === null ? null : n * 12; } },
  { re: /(?:בן|בת|גיל)\s*(\d{1,2})(?!\s*(?:חודש|שבוע))/, months: (m) => (Number(m[1]) <= 6 ? Number(m[1]) * 12 : Number(m[1])) },
  // "בת שלוש" / "בן ארבע": a bare number word after בן/בת/גיל means years
  { re: new RegExp(`(?:בן|בת|גיל)\\s*(${HE_NUM_WORDS})(?![\\u05d0-\\u05ea])(?!\\s*(?:חודש|שבוע))`), months: (m) => { const n = num(m[1], HE_NUM); return n === null || n > 6 ? null : n * 12; } },
  // ---------- Arabic ----------
  { re: /(?:سنتين|سنتان|عامين|عامان)\s*ونصف/, months: () => 30 },
  { re: /(?:سنة|عام)\s*ونصف/, months: () => 18 },
  { re: new RegExp(`(\\d+|${AR_NUM_WORDS})\\s*(?:سنوات|سنين|أعوام)\\s*ونصف`), months: (m) => (num(m[1], AR_NUM) ?? NaN) * 12 + 6 },
  { re: new RegExp(`(?:سنة|عام)\\s*و\\s*(\\d+|${AR_NUM_WORDS})\\s*(?:أشهر|شهور|شهر)`), months: (m) => { const n = num(m[1], AR_NUM); return n === null ? null : 12 + n; } },
  { re: /نصف\s*(?:سنة|عام)/, months: () => 6 },
  { re: /(?:سنتين|سنتان|عامين|عامان)/, months: () => 24 },
  { re: /(?:عمره|عمرها|بعمر|عمر)\s*(?:سنة|عام)(?!\s*و)/, months: () => 12 },
  { re: /(?:شهرين|شهران)/, months: () => 2 },
  { re: /(?:أسبوعين|اسبوعين)/, months: () => 0.5 },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${AR_NUM_WORDS})\\s*(?:أسابيع|اسابيع|أسبوع|اسبوع)`), months: (m) => { const n = num(m[1], AR_NUM); return n === null ? null : (n * 7) / 30.4375; } },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${AR_NUM_WORDS})\\s*(?:أشهر|اشهر|شهور|شهرا|شهراً|شهر)`), months: (m) => num(m[1], AR_NUM) },
  { re: new RegExp(`(\\d+(?:\\.\\d+)?|${AR_NUM_WORDS})\\s*(?:سنوات|سنين|سنة|أعوام|عام)`), months: (m) => { const n = num(m[1], AR_NUM); return n === null ? null : n * 12; } },
];

export function parseAge(input: string): ParsedAge | null {
  const text = toAsciiDigits(input.normalize("NFKC"));
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (!m) continue;
    const months = rule.months(m);
    if (months === null || !Number.isFinite(months) || months < 0 || months > 120) continue;
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    return { months: Math.round(months * 100) / 100, text: m[0].trim(), approximate: APPROX.test(before) };
  }
  return null;
}

/** "18 חודשים" for display in the UI language (does not change handbook wording). */
export function formatMonths(months: number, lang: "he" | "ar"): string {
  if (months < 3 && months % 1 !== 0) {
    const weeks = Math.round((months * 30.4375) / 7);
    return lang === "he" ? `${weeks} שבועות` : `${weeks} أسابيع`;
  }
  if (months >= 24 && months % 12 === 0) return lang === "he" ? `${months / 12} שנים` : `${months / 12} سنوات`;
  return lang === "he" ? `${Math.round(months)} חודשים` : `${Math.round(months)} شهراً`;
}
