import { columnLetter } from "./sheet-utils";
import { text } from "./sheet-utils";
import type { AnyProfile, ColumnMap, MappingProfile, RawWorkbook, SeriesProfile } from "./types";

const SERIES_SHEETS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `סדרה ${n}`);

/**
 * Profile for the current workbook "טבלה כללית מרוכזת.xlsx" (Arabic instructional
 * videos). Column layout verified during the source audit (docs/SOURCE_AUDIT.md).
 */
export const ARABIC_MAPPING_V1: MappingProfile = {
  id: "ar-mapping-v1",
  description: "Arabic video workbook — 'מיפוי' sheet (11 columns, A–K)",
  sheet: "מיפוי",
  headerRow: 1,
  columns: {
    milestone: "A",
    subMilestone: "B",
    video: "C",
    originalTitle: "D",
    correlation: "E",
    milestoneNameAr: "F",
    milestoneNameHe: "G",
    activityAr: "H",
    activityHe: "I",
    audience: "J",
    age: "K",
  },
  crossChecks: [
    { sheet: "רישמה מאוחד ערבית", codeColumn: "B", videoColumns: ["C"], label: "unified_arabic_list" },
    ...SERIES_SHEETS.map((sheet) => ({ sheet, codeColumn: "B", videoColumns: [], label: "series_sheet" })),
  ],
  inventorySheets: [...SERIES_SHEETS.map((sheet) => ({ sheet, codeColumn: "B" })), { sheet: "רישמה מאוחד ערבית", codeColumn: "B" }],
  originalTitlePrefix: "A",
};

/**
 * Profile for "טבלה כללית מרוכזת עברית.xlsx" (Hebrew instructional videos). Column layout verified
 * per sheet on 2026-10-13 (docs/SOURCE_AUDIT.md §11): column E = Hebrew educator video ("לינק יוטיוב
 * מעונות"), the "לינק יוטיוב הורים" column = Hebrew parent video. Spoken language is verified per video
 * afterwards (npm run videos:verify-language), never inferred from the file name.
 */
const EDU = String.raw`^\s*לינק יוטיוב מעונות\s*$`;
const PAR = String.raw`^\s*לינק יוטיוב הורים\s*$`;
const PARENT_COL: Record<number, string> = { 1: "L", 2: "L", 3: "K", 4: "K", 5: "K", 6: "K", 7: "L", 8: "M" };
const ARABIC_COL: Record<number, string> = { 1: "P", 2: "P", 3: "O", 4: "O", 5: "O", 6: "O", 7: "P", 8: "R" };
export const HEBREW_SERIES_V1: SeriesProfile = {
  kind: "series_columns",
  id: "he-series-v1",
  description: "Hebrew video workbook — series sheets 1-8, educator column E + parent column",
  sources: [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
    { sheet: `סדרה ${n}`, headerRow: 1, milestoneColumn: "A", codeColumn: "B", videoColumn: "E", expectHeader: EDU, audience: "educator" as const, ...(n === 7 ? { titleColumn: "F" } : {}) },
    { sheet: `סדרה ${n}`, headerRow: 1, milestoneColumn: "A", codeColumn: "B", videoColumn: PARENT_COL[n], expectHeader: PAR, audience: "parent" as const },
  ]),
  excluded: [
    { sheet: "סדרה 8", column: "F", reason: "header 'לינקים ישנים!!!!' (old links; their YouTube titles end in 'XXX')" },
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ sheet: `סדרה ${n}`, column: ARABIC_COL[n], reason: "Arabic video column; Arabic videos are imported from the Arabic workbook" })),
  ],
  auditSheets: ["מיפוי סרטים ותוכן"],
};

export const BUILTIN_PROFILES: MappingProfile[] = [ARABIC_MAPPING_V1];
export const BUILTIN_SERIES_PROFILES: SeriesProfile[] = [HEBREW_SERIES_V1];

/**
 * Header keywords used to propose a column mapping for a workbook whose layout is
 * not known yet (e.g. the future Hebrew video workbook). The admin confirms or
 * edits the proposal in the column-mapping preview before anything is staged.
 */
const HEADER_HINTS: { field: keyof ColumnMap; patterns: RegExp[] }[] = [
  { field: "subMilestone", patterns: [/תת[\s-]*אבן[\s-]*דרך(?!.*(עברית|ערבית|שם))/, /sub[\s-]*milestone/i, /المرحلة الفرعية/] },
  { field: "milestone", patterns: [/^אבן[\s-]*דרך$/, /^milestone$/i, /^المرحلة$/] },
  { field: "video", patterns: [/קישור|לינק|ילנק|סרטון|יוטיוב|youtube|video|url|link|رابط/i] },
  { field: "originalTitle", patterns: [/כותרת מקורית|original title/i] },
  { field: "correlation", patterns: [/קורלציה|correlation/i] },
  { field: "milestoneNameAr", patterns: [/בערבית.*אבן דרך ראשית|ערבית.*\(אבן/] },
  { field: "milestoneNameHe", patterns: [/שם אבן דרך.*עברית|^שם אבן דרך$/] },
  { field: "activityAr", patterns: [/בערבית.*תת/] },
  { field: "activityHe", patterns: [/תת[\s-]*אבן[\s-]*דרך.*עברית|תיאור|description/i] },
  { field: "audience", patterns: [/קהל|audience/i] },
  { field: "age", patterns: [/גיל|age/i] },
];

export interface ProfileProposal {
  sheet: string;
  headerRow: number;
  headers: { column: string; header: string }[];
  columns: Partial<ColumnMap>;
  unmatchedHeaders: string[];
  confidence: "high" | "medium" | "low";
}

/** Suggest a mapping for each sheet; the best-scoring sheet comes first. */
export function proposeProfiles(workbook: RawWorkbook): ProfileProposal[] {
  const proposals: ProfileProposal[] = [];
  for (const sheet of workbook.sheets) {
    const headerRowData = sheet.rows.slice(0, 5).find((row) =>
      row.cells.filter((c) => typeof c === "string" && c.trim()).length >= 2,
    );
    if (!headerRowData) continue;
    const headers = headerRowData.cells
      .map((c, i) => ({ column: columnLetter(i), header: typeof c === "string" ? c.trim() : "" }))
      .filter((h) => h.header);
    const columns: Partial<ColumnMap> = {};
    const used = new Set<string>();
    for (const hint of HEADER_HINTS) {
      const match = headers.find((h) => !used.has(h.column) && hint.patterns.some((p) => p.test(h.header)));
      if (match) {
        columns[hint.field] = match.column;
        used.add(match.column);
      }
    }
    const required = Boolean(columns.subMilestone && columns.video);
    const score = Object.keys(columns).length;
    proposals.push({
      sheet: sheet.name,
      headerRow: headerRowData.r,
      headers,
      columns,
      unmatchedHeaders: headers.filter((h) => !used.has(h.column)).map((h) => `${h.column}: ${h.header}`),
      confidence: required && score >= 6 ? "high" : required ? "medium" : "low",
    });
  }
  const rank = { high: 2, medium: 1, low: 0 };
  return proposals.sort((a, b) => rank[b.confidence] - rank[a.confidence] || Object.keys(b.columns).length - Object.keys(a.columns).length);
}

/** Use a built-in profile when the workbook matches its layout exactly (every expected header present). */
export function matchBuiltinProfile(workbook: RawWorkbook): AnyProfile | null {
  for (const profile of BUILTIN_SERIES_PROFILES) {
    const ok = profile.sources.every((src) => {
      const sheet = workbook.sheets.find((s) => s.name === src.sheet);
      const header = sheet?.rows.find((r) => r.r === src.headerRow);
      return Boolean(header && new RegExp(src.expectHeader).test(text(header, src.videoColumn) ?? ""));
    });
    if (ok) return profile;
  }
  for (const profile of BUILTIN_PROFILES) {
    const sheet = workbook.sheets.find((s) => s.name === profile.sheet);
    const header = sheet?.rows.find((r) => r.r === profile.headerRow);
    if (!header) continue;
    const expected: Record<string, RegExp> = { subMilestone: /תת אבן דרך/, video: /קישור/, correlation: /קורלציה/ };
    const ok = Object.entries(expected).every(([field, re]) => {
      const col = profile.columns[field as keyof ColumnMap];
      if (!col) return false;
      const idx = col.charCodeAt(0) - 65;
      return re.test(String(header.cells[idx] ?? ""));
    });
    if (ok) return profile;
  }
  return null;
}
