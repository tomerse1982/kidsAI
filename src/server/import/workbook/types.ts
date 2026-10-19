import { z } from "zod";

/** Raw workbook as produced by ingestion/excel_read.py (openpyxl) or the exceljs reader. */
export type CellValue = string | number | boolean | null;
export interface RawRow {
  /** 1-based Excel row number — kept for traceability on every record. */
  r: number;
  cells: CellValue[];
  links?: Record<string, string>;
}
export interface RawSheet {
  name: string;
  maxRow: number;
  maxCol: number;
  /** Merged ranges such as "A2:A7" (anchor = top-left cell; other cells read as empty). */
  merges?: string[];
  rows: RawRow[];
}
export interface RawWorkbook {
  reader: string;
  file: string;
  sha256: string;
  sheets: RawSheet[];
}

export const LanguageSchema = z.enum(["he", "ar"]);
export type VideoLang = z.infer<typeof LanguageSchema>;

/** Column letters (A, B, ...) for each logical field of a video-mapping sheet. */
export const ColumnMapSchema = z.object({
  milestone: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  subMilestone: z.string().regex(/^[A-Z]{1,2}$/),
  video: z.string().regex(/^[A-Z]{1,2}$/),
  originalTitle: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  correlation: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  milestoneNameAr: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  milestoneNameHe: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  activityAr: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  activityHe: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  audience: z.string().regex(/^[A-Z]{1,2}$/).optional(),
  age: z.string().regex(/^[A-Z]{1,2}$/).optional(),
});
export type ColumnMap = z.infer<typeof ColumnMapSchema>;

export const CrossCheckSchema = z.object({
  /** Sheet that lists the same sub-milestones with full URLs (e.g. "רישמה מאוחד ערבית"). */
  sheet: z.string(),
  codeColumn: z.string().regex(/^[A-Z]{1,2}$/),
  /** Columns that may contain the video link; any match counts. Empty = scan whole row. */
  videoColumns: z.array(z.string().regex(/^[A-Z]{1,2}$/)).default([]),
  label: z.string(),
});

export const MappingProfileSchema = z.object({
  id: z.string(),
  description: z.string(),
  sheet: z.string(),
  headerRow: z.number().int().positive(),
  columns: ColumnMapSchema,
  /** Additional sheets used only for validation (never as a source of mappings). */
  crossChecks: z.array(CrossCheckSchema).default([]),
  /** Sheets that list sub-milestone codes (with or without videos) for missing-mapping detection. */
  inventorySheets: z.array(z.object({ sheet: z.string(), codeColumn: z.string() })).default([]),
  /** Expected prefix of column D codes for this language (e.g. "A" for the Arabic series). */
  originalTitlePrefix: z.string().optional(),
});
export type MappingProfile = z.infer<typeof MappingProfileSchema>;

const Col = z.string().regex(/^[A-Z]{1,2}$/);

/**
 * Layout where every series sheet carries the video links in fixed columns (one column per
 * audience), e.g. the Hebrew workbook: column E = educator ("מעונות") video, column L/K/M = parent
 * ("הורים") video. Each source is checked against its expected header before any row is read.
 */
export const SeriesProfileSchema = z.object({
  kind: z.literal("series_columns"),
  id: z.string(),
  description: z.string(),
  sources: z.array(z.object({
    sheet: z.string(),
    headerRow: z.number().int().positive().default(1),
    milestoneColumn: Col.default("A"),
    codeColumn: Col.default("B"),
    videoColumn: Col,
    /** The header of videoColumn must match this pattern, else the source is rejected (layout changed). */
    expectHeader: z.string(),
    audience: z.enum(["educator", "parent"]),
    /** Optional column with the YouTube title as written by the editors. */
    titleColumn: Col.optional(),
  })).min(1),
  /** Columns that look like video links but must never be imported (documented reason). */
  excluded: z.array(z.object({ sheet: z.string(), column: Col, reason: z.string() })).default([]),
  /** Sheets read only for the audit report. */
  auditSheets: z.array(z.string()).default([]),
});
export type SeriesProfile = z.infer<typeof SeriesProfileSchema>;

/** Any supported import profile. Profiles stored before `kind` existed are single-sheet profiles. */
export const AnyProfileSchema = z.union([SeriesProfileSchema, MappingProfileSchema]);
export type AnyProfile = SeriesProfile | MappingProfile;
export const isSeriesProfile = (p: AnyProfile): p is SeriesProfile => (p as SeriesProfile).kind === "series_columns";

export type IssueSeverity = "info" | "warning" | "error" | "critical";
export interface ParsedIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  worksheet?: string;
  rowNumber?: number;
  details?: Record<string, unknown>;
}

export type SegmentRole = "overview" | "exercise" | "parent_guidance";
export type AudienceValue = "educator" | "parent" | "both" | "unknown";

export interface ValidationNote {
  check: string;
  result: "match" | "mismatch" | "missing" | "float_equivalent" | "not_applicable";
  detail?: string;
}

/** One normalised row of the mapping sheet. */
export interface NormalizedRow {
  worksheet: string;
  rowNumber: number;
  raw: Record<string, CellValue>;
  status: "valid" | "invalid" | "duplicate" | "skipped";
  milestoneCode: string | null;
  milestoneCodeSource: "explicit" | "merged_range" | "forward_filled" | "derived_from_sub" | null;
  subMilestoneCode: string | null;
  sequence: number | null;
  videoId: string | null;
  videoRaw: string | null;
  originalTitle: string | null;
  correlationText: string | null;
  milestoneNameAr: string | null;
  milestoneNameHe: string | null;
  activityAr: string | null;
  activityHe: string | null;
  audienceRaw: string | null;
  audience: AudienceValue;
  ageRaw: string | null;
  role: SegmentRole;
  validation: ValidationNote[];
  confidence: "verified" | "source_asserted" | "needs_review" | "conflict";
  messages: string[];
}

export interface ParseResult {
  profile: AnyProfile;
  language: VideoLang;
  workbook: { file: string; sha256: string; reader: string; sheets: { name: string; rows: number }[] };
  rows: NormalizedRow[];
  issues: ParsedIssue[];
  /** Sub-milestone codes listed in inventory sheets that have no video in the mapping sheet. */
  missingMappings: { code: string; sheet: string; rowNumber: number }[];
  stats: Record<string, number>;
}
