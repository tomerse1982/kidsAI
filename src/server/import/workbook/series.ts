/**
 * Parser for "series_columns" workbooks (one sheet per series, fixed video columns per audience),
 * e.g. the Hebrew video workbook. Produces the same NormalizedRow records as the single-sheet
 * parser so staging, preview and publication are shared.
 *
 * Rules: the sub-milestone code comes from the code column (text) and is validated against the
 * merged milestone range in column A; video ids are taken from the hyperlink target or the cell
 * text and are never repaired or guessed; missing / invalid links are reported, not filled in.
 */
import { isSubMilestoneCode, milestoneCellMatches, normalizeCodeText, splitSubMilestoneCode } from "@/lib/codes";
import { parseYouTube } from "@/lib/youtube";
import { mergedRowAnchors } from "./parse";
import { cell, linkOrText, text } from "./sheet-utils";
import type { NormalizedRow, ParsedIssue, ParseResult, RawWorkbook, SeriesProfile, ValidationNote, VideoLang } from "./types";

export function parseSeriesWorkbook(workbook: RawWorkbook, language: VideoLang, profile: SeriesProfile): ParseResult {
  const issues: ParsedIssue[] = [];
  const rows: NormalizedRow[] = [];
  const missing: { code: string; sheet: string; rowNumber: number }[] = [];
  const seen = new Map<string, NormalizedRow>(); // `${code}|${audience}`
  const byVideo = new Map<string, NormalizedRow[]>();

  for (const src of profile.sources) {
    const sheet = workbook.sheets.find((s) => s.name === src.sheet);
    if (!sheet) {
      issues.push({ severity: "critical", code: "source_sheet_missing", message: `Worksheet "${src.sheet}" not found`, worksheet: src.sheet });
      continue;
    }
    const header = sheet.rows.find((r) => r.r === src.headerRow);
    const headerText = header ? text(header, src.videoColumn) ?? "" : "";
    if (!new RegExp(src.expectHeader).test(headerText)) {
      issues.push({
        severity: "critical", code: "unexpected_header",
        message: `${src.sheet}!${src.videoColumn}${src.headerRow} is "${headerText}", expected /${src.expectHeader}/ — layout changed, source not imported`,
        worksheet: src.sheet, rowNumber: src.headerRow,
      });
      continue;
    }
    const anchors = mergedRowAnchors(sheet, src.milestoneColumn);
    for (const row of sheet.rows.filter((r) => r.r > src.headerRow)) {
      const code = normalizeCodeText(text(row, src.codeColumn));
      if (!code) continue;
      const validation: ValidationNote[] = [{ check: "workbook_column", result: "match", detail: `${src.sheet}!${src.videoColumn}: ${headerText.trim()}` }];
      const videoRaw = linkOrText(row, src.videoColumn);
      const title = src.titleColumn ? text(row, src.titleColumn) : null;
      const record: NormalizedRow = {
        worksheet: sheet.name, rowNumber: row.r,
        raw: { milestone: cell(row, src.milestoneColumn), subMilestone: cell(row, src.codeColumn), video: cell(row, src.videoColumn), column: src.videoColumn, ...(row.links?.[src.videoColumn] ? { link: row.links[src.videoColumn] } : {}) },
        status: "valid", milestoneCode: null, milestoneCodeSource: null, subMilestoneCode: code, sequence: null,
        videoId: null, videoRaw, originalTitle: title, correlationText: null,
        milestoneNameAr: null, milestoneNameHe: null, activityAr: null, activityHe: null,
        audienceRaw: src.audience, audience: src.audience, ageRaw: null, role: "exercise",
        validation, confidence: "source_asserted", messages: [],
      };
      rows.push(record);

      const split = splitSubMilestoneCode(code);
      if (!split || !isSubMilestoneCode(code)) {
        record.status = "invalid";
        issues.push({ severity: "error", code: "invalid_sub_milestone_code", message: `"${code}" is not a sub-milestone code (n.n.n)`, worksheet: sheet.name, rowNumber: row.r });
        continue;
      }
      record.milestoneCode = split.milestone;
      record.sequence = split.sequence;

      // column A: explicit value or merged range, validated against the code
      const explicit = cell(row, src.milestoneColumn);
      const anchorRow = anchors.get(row.r);
      const aValue = explicit !== null && String(explicit).trim() !== "" ? explicit : anchorRow ? cell(sheet.rows.find((x) => x.r === anchorRow) ?? { r: 0, cells: [] }, src.milestoneColumn) : null;
      if (aValue === null) {
        record.milestoneCodeSource = "derived_from_sub";
        validation.push({ check: "milestone_column", result: "not_applicable" });
      } else {
        const m = milestoneCellMatches(aValue, split.milestone);
        record.milestoneCodeSource = explicit !== null && String(explicit).trim() !== "" ? "explicit" : "merged_range";
        validation.push({ check: "milestone_column", result: m === "mismatch" ? "mismatch" : "match", detail: String(aValue) });
        if (m === "mismatch") {
          // e.g. סדרה 7: rows were inserted and the merged column-A labels shifted. Column B stays
          // authoritative; the YouTube title check (npm run videos:verify-language) confirms or refutes it.
          record.confidence = "needs_review";
          issues.push({ severity: "warning", code: "milestone_column_shifted", message: `Column ${src.milestoneColumn} shows "${aValue}" for ${code}; code taken from column ${src.codeColumn}, pending YouTube title check`, worksheet: sheet.name, rowNumber: row.r });
        }
      }

      const key = `${code}|${src.audience}`;
      if (seen.has(key)) {
        record.status = "duplicate";
        issues.push({ severity: "error", code: "duplicate_sub_milestone", message: `${code} (${src.audience}) already defined on ${seen.get(key)!.worksheet} row ${seen.get(key)!.rowNumber}`, worksheet: sheet.name, rowNumber: row.r });
        continue;
      }
      seen.set(key, record);

      const yt = parseYouTube(videoRaw);
      if (!yt.ok) {
        if (yt.reason === "empty") {
          record.status = "skipped";
          missing.push({ code, sheet: sheet.name, rowNumber: row.r });
          issues.push({ severity: "warning", code: "missing_video", message: `${code}: no ${src.audience} video link in ${src.sheet}!${src.videoColumn}${row.r}`, worksheet: sheet.name, rowNumber: row.r });
        } else {
          record.status = "invalid";
          issues.push({ severity: "error", code: "invalid_video_identifier", message: `${code} (${src.audience}, ${src.sheet}!${src.videoColumn}${row.r}): "${yt.raw}" is not a valid YouTube link (${yt.reason}); not imported, nothing substituted`, worksheet: sheet.name, rowNumber: row.r });
        }
        continue;
      }
      record.videoId = yt.id;
      const shown = text(row, src.videoColumn);
      if (row.links?.[src.videoColumn] && shown && parseYouTube(shown).ok && (parseYouTube(shown) as { id: string }).id !== yt.id) {
        record.confidence = "conflict";
        issues.push({ severity: "error", code: "hyperlink_text_mismatch", message: `${code}: cell text ${shown} and hyperlink ${row.links[src.videoColumn]} point to different videos`, worksheet: sheet.name, rowNumber: row.r });
      }
      byVideo.set(yt.id, [...(byVideo.get(yt.id) ?? []), record]);
    }
  }

  // one video used for several sub-milestones or for both audiences
  for (const [videoId, recs] of byVideo) {
    if (recs.length < 2) continue;
    const where = recs.map((r) => `${r.subMilestoneCode}/${r.audience}`).join(", ");
    for (const r of recs) {
      r.validation.push({ check: "unique_video", result: "mismatch", detail: `same video for ${where}` });
      if (r.confidence === "source_asserted") r.confidence = "needs_review";
      issues.push({ severity: "warning", code: "duplicate_video_id", message: `Video ${videoId} is linked from ${where}`, worksheet: r.worksheet, rowNumber: r.rowNumber, details: { videoId } });
    }
  }

  for (const ex of profile.excluded) {
    issues.push({ severity: "info", code: "excluded_column", message: `${ex.sheet}!${ex.column} not imported: ${ex.reason}`, worksheet: ex.sheet });
  }
  for (const name of profile.auditSheets) {
    const s = workbook.sheets.find((x) => x.name === name);
    issues.push({ severity: "info", code: "auxiliary_sheet_audit", message: s ? `Sheet "${name}" (${s.rows.length} non-empty rows) is not a source of ${language} videos and was not imported` : `Sheet "${name}" not found`, worksheet: name });
  }
  const sourcesUsed = new Set(profile.sources.map((s) => s.sheet));
  for (const s of workbook.sheets) {
    if (!sourcesUsed.has(s.name) && !profile.auditSheets.includes(s.name)) {
      issues.push({ severity: "warning", code: "unknown_sheet", message: `Sheet "${s.name}" is not described by profile ${profile.id}; not imported`, worksheet: s.name });
    }
  }

  const valid = rows.filter((r) => r.status === "valid");
  const count = (st: string) => rows.filter((r) => r.status === st).length;
  return {
    profile, language,
    workbook: { file: workbook.file, sha256: workbook.sha256, reader: workbook.reader, sheets: workbook.sheets.map((s) => ({ name: s.name, rows: s.rows.length })) },
    rows, issues, missingMappings: missing,
    stats: {
      dataRows: rows.length, valid: valid.length, invalid: count("invalid"), duplicate: count("duplicate"), skipped: count("skipped"),
      milestones: new Set(valid.map((r) => r.milestoneCode)).size, uniqueVideos: byVideo.size,
      educatorVideos: valid.filter((r) => r.audience === "educator").length, parentVideos: valid.filter((r) => r.audience === "parent").length,
      verified: 0, conflict: valid.filter((r) => r.confidence === "conflict").length,
      needsReview: valid.filter((r) => r.confidence === "needs_review").length,
      sourceAsserted: valid.filter((r) => r.confidence === "source_asserted").length,
      missingMappings: missing.length,
      mergedRangeFilled: valid.filter((r) => r.milestoneCodeSource === "merged_range").length,
    },
  };
}
