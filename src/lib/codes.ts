/**
 * Canonical milestone / sub-milestone identifiers.
 *
 * Identifiers are strings ("1.1", "4.10", "1.1.3"). Spreadsheets often store the
 * main milestone as a *number*, so "4.10" arrives as 4.1 — numerically equal to
 * "4.1". Never derive a code from a float alone: use the sub-milestone code (always
 * text) and only use the float to *validate* it.
 */

export const MILESTONE_CODE = /^(\d{1,2})\.(\d{1,2})$/;
export const SUB_MILESTONE_CODE = /^(\d{1,2})\.(\d{1,2})\.(\d{1,3})$/;
export const EXERCISE_CODE = /^(\d{1,2})\.(\d{1,2})-E(\d{1,3})(?:-(he|ar))?$/;

export function normalizeCodeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .normalize("NFKC")
    .replace(/[‎‏‪-‮]/g, "")
    .trim();
  return text.length ? text : null;
}

export function isMilestoneCode(value: string): boolean {
  return MILESTONE_CODE.test(value);
}

export function isSubMilestoneCode(value: string): boolean {
  return SUB_MILESTONE_CODE.test(value);
}

/** "1.1.3" -> { milestone: "1.1", sequence: 3 } */
export function splitSubMilestoneCode(code: string): { milestone: string; chapter: number; sequence: number } | null {
  const m = SUB_MILESTONE_CODE.exec(code);
  if (!m) return null;
  return { milestone: `${Number(m[1])}.${Number(m[2])}`, chapter: Number(m[1]), sequence: Number(m[3]) };
}

export function chapterOf(milestoneCode: string): number | null {
  const m = MILESTONE_CODE.exec(milestoneCode);
  return m ? Number(m[1]) : null;
}

/**
 * Does a raw main-milestone cell value agree with a canonical milestone code?
 * Accepts the exact text ("4.10") and the float rendering a spreadsheet produces
 * for it (4.1), and reports which one matched.
 */
export function milestoneCellMatches(raw: unknown, canonical: string): "exact" | "float_equivalent" | "mismatch" {
  const text = normalizeCodeText(raw);
  if (text === null) return "mismatch";
  if (text === canonical) return "exact";
  const asNumber = Number(text);
  if (Number.isFinite(asNumber) && Number.isFinite(Number(canonical)) && asNumber === Number(canonical)) {
    return "float_equivalent";
  }
  return "mismatch";
}

/** Sort key so that 1.2 < 1.10 and 1.1.2 < 1.1.10 (string sort gets these wrong). */
export function codeSortKey(code: string): number[] {
  return code.split(/[.\-E]+/).filter(Boolean).map((p) => (/^\d+$/.test(p) ? Number(p) : 0));
}

export function compareCodes(a: string, b: string): number {
  const ka = codeSortKey(a);
  const kb = codeSortKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const d = (ka[i] ?? -1) - (kb[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Column E ("קורלציה למספור אבן הדרך"): e.g. "מלאה: 1.1 תת-סעיף 3 (מבוא לסדרה)".
 * Returns the referenced milestone + subsection so it can be compared with column B.
 */
export function parseCorrelationText(text: string | null): {
  kind: string | null;
  milestone: string;
  subsection: number;
  isIntro: boolean;
} | null {
  if (!text) return null;
  const m = /^\s*([^:]+):\s*(\d{1,2}\.\d{1,2})\s*תת-?\s*סעיף\s*(\d{1,3})(.*)$/u.exec(text);
  if (!m) return null;
  return { kind: m[1].trim(), milestone: m[2], subsection: Number(m[3]), isIntro: /מבוא/.test(m[4] ?? "") };
}

/** Column D ("כותרת מקורית ביוטיוב"): "A1.1.3" -> { prefix: "A", code: "1.1.3" } */
export function parseOriginalTitleCode(text: string | null): { prefix: string; code: string } | null {
  if (!text) return null;
  const m = /^\s*([A-Za-z]*)\s*(\d{1,2}\.\d{1,2}\.\d{1,3})\s*$/.exec(text);
  return m ? { prefix: m[1].toUpperCase(), code: m[2] } : null;
}

/**
 * Code inside a YouTube video title of the LinkCaring series: "1.1.3" (Hebrew educator),
 * "P1.1.3" / "P.1.1.3" (Hebrew parent), "A1.1.3" (Arabic). Tolerates the typing variants found on
 * the channel ("4 8 12", "P8.1. 2", "7.5..7"). A trailing "XXX" marks a retired upload.
 */
export function parseVideoTitleCode(title: string | null | undefined): { prefix: string; code: string; retired: boolean } | null {
  if (!title) return null;
  const m = /^\s*([AP]?)\s*\.?\s*(\d{1,2}(?:[\s.]+\d{1,3}){2})\s*(X*)\s*$/i.exec(title.normalize("NFKC"));
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), code: m[2].replace(/[\s.]+/g, "."), retired: m[3].length > 0 };
}

/** Compare a title code with the mapped sub-milestone: identical, same milestone only, or another milestone. */
export function compareTitleCode(titleCode: string, mappedCode: string): "match" | "same_milestone" | "different_milestone" {
  if (titleCode === mappedCode) return "match";
  const a = splitSubMilestoneCode(titleCode);
  const b = splitSubMilestoneCode(mappedCode);
  return a && b && a.milestone === b.milestone ? "same_milestone" : "different_milestone";
}
