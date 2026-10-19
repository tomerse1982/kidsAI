import {
  isSubMilestoneCode, milestoneCellMatches, normalizeCodeText, parseCorrelationText,
  parseOriginalTitleCode, splitSubMilestoneCode,
} from "@/lib/codes";
import { parseYouTube } from "@/lib/youtube";
import { cell, columnLetter, linkOrText, text } from "./sheet-utils";
import type {
  AudienceValue, CellValue, MappingProfile, NormalizedRow, ParsedIssue, ParseResult,
  RawRow, RawSheet, RawWorkbook, SegmentRole, ValidationNote, VideoLang,
} from "./types";

const ANY_SUB_CODE = /(?:^|[^\d.])[A-Za-z]?(\d{1,2}\.\d{1,2}\.\d{1,3})(?![\d.])/;

export function classifyRole(activityHe: string | null, activityAr: string | null, correlationIntro: boolean): SegmentRole {
  if (correlationIntro || /^מבוא/.test(activityHe ?? "") || /^مقدمة/.test(activityAr ?? "")) return "overview";
  if (/^(שיתוף|שתפו)( והדרכת| את)? ההורים/.test(activityHe ?? "") || /(مشاركة|إشراك|أشركوا) الأهل/.test(activityAr ?? "")) {
    return "parent_guidance";
  }
  return "exercise";
}

/** Column J holds e.g. "גננת (הנחיה לצוות להדריך את ההורים)": the audience is the part before "(". */
export function classifyAudience(raw: string | null): AudienceValue {
  if (!raw) return "unknown";
  const head = raw.split("(")[0];
  const educator = /גננת|צוות|מטפלת|educator|معلم|مربي/i.test(head);
  const parent = /הורה|הורים|parent|الأهل|أهل/i.test(head);
  if (educator && parent) return "both";
  if (educator) return "educator";
  if (parent) return "parent";
  return "unknown";
}

function rowRecord(row: RawRow, profile: MappingProfile): Record<string, CellValue> {
  const rec: Record<string, CellValue> = {};
  for (const [field, letter] of Object.entries(profile.columns)) if (letter) rec[field] = cell(row, letter);
  if (row.links) rec.__links = JSON.stringify(row.links);
  return rec;
}

interface CrossIndex {
  label: string;
  byCode: Map<string, { sheet: string; rowNumber: number; ids: string[]; invalidValues: string[]; textMismatches: string[] }>;
}

function buildCrossIndex(workbook: RawWorkbook, check: MappingProfile["crossChecks"][number]): CrossIndex | null {
  const sheet = workbook.sheets.find((s) => s.name === check.sheet);
  if (!sheet) return null;
  const byCode: CrossIndex["byCode"] = new Map();
  for (const row of sheet.rows) {
    const code = normalizeCodeText(text(row, check.codeColumn));
    if (!code || !isSubMilestoneCode(code)) continue;
    const ids: string[] = [];
    const invalidValues: string[] = [];
    const letters = check.videoColumns.length ? check.videoColumns : row.cells.map((_, i) => columnLetter(i));
    const textMismatches: string[] = [];
    for (const letter of letters) {
      if (letter === check.codeColumn) continue;
      const v = linkOrText(row, letter);
      if (v === null) continue;
      const parsed = parseYouTube(v);
      if (parsed.ok) ids.push(parsed.id);
      else if (check.videoColumns.length) invalidValues.push(String(v));
      const shown = text(row, letter);
      if (row.links?.[letter] && shown !== null && !parseYouTube(shown).ok) textMismatches.push(`${letter}: "${shown}" -> ${row.links[letter]}`);
    }
    byCode.set(code, { sheet: sheet.name, rowNumber: row.r, ids, invalidValues, textMismatches });
  }
  return { label: check.label, byCode };
}

export function parseVideoWorkbook(workbook: RawWorkbook, language: VideoLang, profile: MappingProfile): ParseResult {
  const issues: ParsedIssue[] = [];
  const rows: NormalizedRow[] = [];
  const sheet = workbook.sheets.find((s) => s.name === profile.sheet);
  const sheetsSummary = workbook.sheets.map((s) => ({ name: s.name, rows: s.rows.length }));
  const base = { profile, language, workbook: { file: workbook.file, sha256: workbook.sha256, reader: workbook.reader, sheets: sheetsSummary } };

  if (!sheet) {
    issues.push({ severity: "critical", code: "mapping_sheet_missing", message: `Worksheet "${profile.sheet}" not found` });
    return { ...base, rows, issues, missingMappings: [], stats: {} };
  }

  const dataRows = sheet.rows.filter((r) => r.r > profile.headerRow);
  const mergeAnchors = mergedRowAnchors(sheet, profile.columns.milestone);
  let lastExplicit: { raw: CellValue; code: string; row: number } | null = null;
  const seenSub = new Map<string, number>();
  const videoToCodes = new Map<string, string[]>();

  for (const row of dataRows) {
    const raw = rowRecord(row, profile);
    const messages: string[] = [];
    const validation: ValidationNote[] = [];
    const subText = normalizeCodeText(text(row, profile.columns.subMilestone));
    const rawMilestone = cell(row, profile.columns.milestone);
    const activityHe = text(row, profile.columns.activityHe);
    const activityAr = text(row, profile.columns.activityAr);
    const correlationText = text(row, profile.columns.correlation);
    const correlation = parseCorrelationText(correlationText);
    const originalTitle = text(row, profile.columns.originalTitle);
    const videoRaw = linkOrText(row, profile.columns.video);
    const audienceRaw = text(row, profile.columns.audience);

    const record: NormalizedRow = {
      worksheet: sheet.name, rowNumber: row.r, raw, status: "valid",
      milestoneCode: null, milestoneCodeSource: null, subMilestoneCode: subText, sequence: null,
      videoId: null, videoRaw, originalTitle, correlationText,
      milestoneNameAr: text(row, profile.columns.milestoneNameAr),
      milestoneNameHe: text(row, profile.columns.milestoneNameHe),
      activityAr, activityHe, audienceRaw, audience: classifyAudience(audienceRaw),
      ageRaw: text(row, profile.columns.age), role: classifyRole(activityHe, activityAr, correlation?.isIntro ?? false),
      validation, confidence: "source_asserted", messages,
    };
    rows.push(record);

    // --- sub-milestone (column B) is the canonical key --------------------------
    if (!subText) {
      record.status = "skipped";
      issues.push({ severity: "warning", code: "row_without_sub_milestone", message: "Row has data but no sub-milestone code", worksheet: sheet.name, rowNumber: row.r });
      continue;
    }
    const split = splitSubMilestoneCode(subText);
    if (!split || !isSubMilestoneCode(subText)) {
      record.status = "invalid";
      issues.push({ severity: "error", code: "invalid_sub_milestone_code", message: `"${subText}" is not a sub-milestone code (n.n.n)`, worksheet: sheet.name, rowNumber: row.r });
      continue;
    }
    record.milestoneCode = split.milestone;
    record.sequence = split.sequence;

    // --- column A with controlled forward-fill, validated against column B ------
    if (!profile.columns.milestone) {
      // layout without a main-milestone column: the code is derived from the sub-milestone itself
      record.milestoneCodeSource = "derived_from_sub";
      validation.push({ check: "milestone_column", result: "not_applicable" });
    } else if (rawMilestone !== null && String(rawMilestone).trim() !== "") {
      const match = milestoneCellMatches(rawMilestone, split.milestone);
      record.milestoneCodeSource = "explicit";
      validation.push({ check: "milestone_column", result: match === "exact" ? "match" : match, detail: String(rawMilestone) });
      if (match === "mismatch") {
        issues.push({ severity: "error", code: "milestone_sub_mismatch", message: `Column A "${rawMilestone}" does not match sub-milestone ${subText}`, worksheet: sheet.name, rowNumber: row.r });
      } else if (match === "float_equivalent" && String(rawMilestone) !== split.milestone) {
        issues.push({ severity: "info", code: "milestone_float_rendering", message: `Column A stored as number ${rawMilestone}; canonical code ${split.milestone} taken from column B`, worksheet: sheet.name, rowNumber: row.r });
      }
      lastExplicit = { raw: rawMilestone, code: split.milestone, row: row.r };
    } else if (mergeAnchors.has(row.r)) {
      // Controlled forward-fill: the row lies inside a merged column-A range.
      const anchorRow = mergeAnchors.get(row.r)!;
      const anchorRaw = cell(sheet.rows.find((x) => x.r === anchorRow) ?? { r: anchorRow, cells: [] }, profile.columns.milestone);
      const match = milestoneCellMatches(anchorRaw, split.milestone);
      record.milestoneCodeSource = "merged_range";
      validation.push({ check: "milestone_merged_range", result: match === "mismatch" ? "mismatch" : "match", detail: `${profile.columns.milestone}${anchorRow}=${String(anchorRaw)}` });
      if (match === "mismatch") {
        issues.push({ severity: "error", code: "milestone_sub_mismatch", message: `Merged column-${profile.columns.milestone} value "${String(anchorRaw)}" (row ${anchorRow}) does not contain ${subText}`, worksheet: sheet.name, rowNumber: row.r });
      }
    } else if (lastExplicit && milestoneCellMatches(lastExplicit.raw, split.milestone) !== "mismatch") {
      if (mergeAnchors.size) {
        issues.push({ severity: "info", code: "outside_merged_range", message: `Row is outside the merged milestone ranges; value carried from row ${lastExplicit.row}`, worksheet: sheet.name, rowNumber: row.r });
      }
      record.milestoneCodeSource = "forward_filled";
      validation.push({ check: "milestone_forward_fill", result: "match", detail: `from row ${lastExplicit.row}` });
    } else {
      record.milestoneCodeSource = "derived_from_sub";
      validation.push({ check: "milestone_forward_fill", result: "mismatch", detail: lastExplicit ? `previous group ${lastExplicit.code} (row ${lastExplicit.row})` : "no previous milestone" });
      issues.push({ severity: "warning", code: "forward_fill_mismatch", message: `Column A blank and previous group (${lastExplicit?.code ?? "none"}) does not contain ${subText}; milestone ${split.milestone} derived from column B`, worksheet: sheet.name, rowNumber: row.r });
    }

    // --- column E correlation text --------------------------------------------
    if (profile.columns.correlation) {
      if (!correlationText) validation.push({ check: "correlation_text", result: "missing" });
      else if (!correlation) {
        validation.push({ check: "correlation_text", result: "mismatch", detail: "unparseable" });
        issues.push({ severity: "warning", code: "correlation_unparseable", message: `Column E "${correlationText}" could not be parsed`, worksheet: sheet.name, rowNumber: row.r });
      } else {
        const ok = correlation.milestone === split.milestone && correlation.subsection === split.sequence;
        validation.push({ check: "correlation_text", result: ok ? "match" : "mismatch", detail: correlationText });
        if (!ok) issues.push({ severity: "error", code: "correlation_mismatch", message: `Column E "${correlationText}" disagrees with ${subText}`, worksheet: sheet.name, rowNumber: row.r });
      }
    }

    // --- column D original YouTube title code ---------------------------------
    if (profile.columns.originalTitle) {
      const t = parseOriginalTitleCode(originalTitle);
      if (!originalTitle) validation.push({ check: "original_title_code", result: "missing" });
      else if (!t) validation.push({ check: "original_title_code", result: "mismatch", detail: `unparseable: ${originalTitle}` });
      else {
        const ok = t.code === subText && (!profile.originalTitlePrefix || t.prefix === profile.originalTitlePrefix);
        validation.push({ check: "original_title_code", result: ok ? "match" : "mismatch", detail: originalTitle });
        if (!ok) issues.push({ severity: "warning", code: "original_title_mismatch", message: `Column D "${originalTitle}" disagrees with ${subText}`, worksheet: sheet.name, rowNumber: row.r });
      }
    }

    // --- duplicates -------------------------------------------------------------
    if (seenSub.has(subText)) {
      record.status = "duplicate";
      issues.push({ severity: "error", code: "duplicate_sub_milestone", message: `${subText} already defined on row ${seenSub.get(subText)}`, worksheet: sheet.name, rowNumber: row.r });
      continue;
    }
    seenSub.set(subText, row.r);

    // --- video identifier (column C) -------------------------------------------
    const yt = parseYouTube(videoRaw);
    if (!yt.ok) {
      if (yt.reason === "empty") {
        record.status = "skipped";
        issues.push({ severity: "warning", code: "missing_video", message: `${subText} has no video value`, worksheet: sheet.name, rowNumber: row.r });
      } else {
        record.status = "invalid";
        issues.push({ severity: "error", code: "invalid_video_identifier", message: `Invalid video value "${yt.raw}" (${yt.reason})`, worksheet: sheet.name, rowNumber: row.r });
      }
      continue;
    }
    record.videoId = yt.id;
    videoToCodes.set(yt.id, [...(videoToCodes.get(yt.id) ?? []), subText]);
  }

  // --- cross-sheet validation ---------------------------------------------------
  const crossIndexes = profile.crossChecks.map((c) => buildCrossIndex(workbook, c));
  profile.crossChecks.forEach((c, i) => {
    if (!crossIndexes[i]) issues.push({ severity: "warning", code: "cross_check_sheet_missing", message: `Cross-check sheet "${c.sheet}" not found`, worksheet: c.sheet });
  });
  // merge indexes with the same label (e.g. the eight series sheets)
  const byLabel = new Map<string, CrossIndex["byCode"]>();
  for (const idx of crossIndexes) {
    if (!idx) continue;
    const merged = byLabel.get(idx.label) ?? new Map();
    for (const [k, v] of idx.byCode) if (!merged.has(k)) merged.set(k, v);
    byLabel.set(idx.label, merged);
  }
  for (const [label, index] of byLabel) {
    for (const [code, entry] of index) {
      for (const t of entry.textMismatches) {
        issues.push({ severity: "info", code: "hyperlink_text_mismatch", message: `${label}: ${code} cell text differs from its hyperlink (${t}); the hyperlink target is used`, worksheet: entry.sheet, rowNumber: entry.rowNumber });
      }
      for (const bad of entry.invalidValues) {
        issues.push({ severity: "warning", code: "cross_check_invalid_value", message: `${label}: ${code} has a non-URL value "${bad}"`, worksheet: entry.sheet, rowNumber: entry.rowNumber });
      }
    }
    for (const r of rows) {
      if (r.status !== "valid" || !r.videoId || !r.subMilestoneCode) continue;
      const entry = index.get(r.subMilestoneCode);
      if (!entry) {
        r.validation.push({ check: label, result: "missing" });
        continue;
      }
      if (!entry.ids.length) {
        r.validation.push({ check: label, result: "missing", detail: `${entry.sheet}!${entry.rowNumber}: no link` });
        continue;
      }
      const matched = entry.ids.includes(r.videoId);
      r.validation.push({ check: label, result: matched ? "match" : "mismatch", detail: `${entry.sheet}!${entry.rowNumber}: ${entry.ids.join(", ")}` });
      if (!matched) {
        issues.push({ severity: "error", code: "cross_check_mismatch", message: `${r.subMilestoneCode}: mapping has ${r.videoId}, ${entry.sheet} row ${entry.rowNumber} has ${entry.ids.join(", ")}`, worksheet: entry.sheet, rowNumber: entry.rowNumber });
      }
      const extra = entry.ids.filter((id) => id !== r.videoId);
      if (matched && extra.length) {
        issues.push({
          severity: "warning", code: "alternative_link_in_cross_sheet",
          message: `${r.subMilestoneCode}: ${entry.sheet} row ${entry.rowNumber} also lists ${extra.join(", ")} (not imported; mapping sheet is authoritative)`,
          worksheet: entry.sheet, rowNumber: entry.rowNumber, details: { mappingVideo: r.videoId, otherIds: extra },
        });
      }
    }
  }

  // --- duplicate video ids across sub-milestones -------------------------------
  for (const [videoId, codes] of videoToCodes) {
    if (codes.length < 2) continue;
    for (const r of rows.filter((x) => x.videoId === videoId)) {
      r.validation.push({ check: "unique_video", result: "mismatch", detail: `same video for ${codes.join(", ")}` });
      issues.push({ severity: "warning", code: "duplicate_video_id", message: `Video ${videoId} is mapped to ${codes.join(" and ")}`, worksheet: sheet.name, rowNumber: r.rowNumber, details: { videoId, codes } });
    }
  }

  // --- milestone name variants (informational) ------------------------------------
  const names = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.milestoneCode || r.status !== "valid") continue;
    const key = `${r.milestoneNameHe ?? ""} | ${r.milestoneNameAr ?? ""}`;
    names.set(r.milestoneCode, (names.get(r.milestoneCode) ?? new Set()).add(key));
  }
  for (const [code, variants] of names) {
    if (variants.size > 1) {
      issues.push({ severity: "info", code: "milestone_name_variant", message: `Milestone ${code} has ${variants.size} name variants in the mapping sheet; the first is used as the Excel alternate title`, worksheet: sheet.name, details: { variants: [...variants] } });
    }
  }

  // --- confidence ---------------------------------------------------------------------
  for (const r of rows) {
    if (r.status !== "valid") continue;
    const results = r.validation.map((v) => v.result);
    const crossMatched = r.validation.some((v) => byLabel.has(v.check) && v.result === "match");
    if (r.validation.some((v) => v.result === "mismatch" && v.check !== "unique_video" && v.check !== "milestone_forward_fill")) r.confidence = "conflict";
    else if (results.includes("mismatch")) r.confidence = "needs_review";
    else if (crossMatched) r.confidence = "verified";
    else r.confidence = "source_asserted";
  }

  // --- missing mappings: codes listed in inventory sheets without a video ---------------
  const mapped = new Set(rows.filter((r) => r.status === "valid").map((r) => r.subMilestoneCode));
  const missing = new Map<string, { code: string; sheet: string; rowNumber: number }>();
  for (const inv of profile.inventorySheets) {
    const s = workbook.sheets.find((x) => x.name === inv.sheet);
    for (const row of s?.rows ?? []) {
      const code = normalizeCodeText(text(row, inv.codeColumn));
      if (code && isSubMilestoneCode(code) && !mapped.has(code) && !missing.has(code)) missing.set(code, { code, sheet: s!.name, rowNumber: row.r });
    }
  }
  for (const r of rows) {
    if (r.subMilestoneCode && r.status === "skipped" && !missing.has(r.subMilestoneCode)) {
      missing.set(r.subMilestoneCode, { code: r.subMilestoneCode, sheet: r.worksheet, rowNumber: r.rowNumber });
    }
  }
  for (const m of missing.values()) {
    issues.push({ severity: "warning", code: "missing_video_mapping", message: `Sub-milestone ${m.code} is listed in "${m.sheet}" but has no video in the mapping sheet`, worksheet: m.sheet, rowNumber: m.rowNumber });
  }

  // --- sheets not used by the profile: audit, never import ---------------------------
  const used = new Set([profile.sheet, ...profile.crossChecks.map((c) => c.sheet), ...profile.inventorySheets.map((s) => s.sheet)]);
  for (const s of workbook.sheets.filter((x) => !used.has(x.name))) {
    issues.push(auditAuxiliarySheet(s, rows));
  }

  const count = (pred: (r: NormalizedRow) => boolean) => rows.filter(pred).length;
  return {
    ...base,
    rows,
    issues,
    missingMappings: [...missing.values()],
    stats: {
      dataRows: rows.length,
      valid: count((r) => r.status === "valid"),
      invalid: count((r) => r.status === "invalid"),
      duplicate: count((r) => r.status === "duplicate"),
      skipped: count((r) => r.status === "skipped"),
      milestones: new Set(rows.filter((r) => r.status === "valid").map((r) => r.milestoneCode)).size,
      uniqueVideos: videoToCodes.size,
      verified: count((r) => r.status === "valid" && r.confidence === "verified"),
      conflict: count((r) => r.status === "valid" && r.confidence === "conflict"),
      needsReview: count((r) => r.status === "valid" && r.confidence === "needs_review"),
      sourceAsserted: count((r) => r.status === "valid" && r.confidence === "source_asserted"),
      missingMappings: missing.size,
      forwardFilled: count((r) => r.milestoneCodeSource === "forward_filled"),
      mergedRangeFilled: count((r) => r.milestoneCodeSource === "merged_range"),
    },
  };
}

/** row number -> anchor row, for vertical merges in the given column (e.g. "A2:A7"). */
export function mergedRowAnchors(sheet: RawSheet, column: string | undefined): Map<number, number> {
  const map = new Map<number, number>();
  if (!column) return map;
  for (const ref of sheet.merges ?? []) {
    const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref);
    if (!m || m[1] !== column || m[3] !== column) continue;
    for (let r = Number(m[2]) + 1; r <= Number(m[4]); r++) map.set(r, Number(m[2]));
  }
  return map;
}

/** Compare (code, video) pairs found anywhere in an unused sheet with the mapping sheet. */
function auditAuxiliarySheet(sheet: RawSheet, rows: NormalizedRow[]): ParsedIssue {
  const byCode = new Map(rows.filter((r) => r.videoId).map((r) => [r.subMilestoneCode!, r.videoId!]));
  let consistent = 0;
  const inconsistent: string[] = [];
  const unknown: string[] = [];
  for (const row of sheet.rows) {
    let code: string | null = null;
    const ids: string[] = [];
    for (const v of row.cells) {
      if (v === null) continue;
      const s = String(v).trim();
      const yt = parseYouTube(s);
      if (yt.ok) ids.push(yt.id);
      const m = ANY_SUB_CODE.exec(` ${s}`);
      if (!code && m && /^[A-Za-z]?\d{1,2}\.\d{1,2}\.\d{1,3}$/.test(s)) code = m[1];
    }
    if (!code || !ids.length) continue;
    const expected = byCode.get(code);
    if (!expected) unknown.push(code);
    else if (ids.includes(expected)) consistent++;
    else inconsistent.push(`${code}@${row.r}`);
  }
  const severity = inconsistent.length || unknown.length ? "warning" : "info";
  return {
    severity,
    code: "auxiliary_sheet_audit",
    message: `Sheet "${sheet.name}" not imported. ${consistent} code/video pairs match the mapping sheet, ${inconsistent.length} differ, ${unknown.length} unknown codes.`,
    worksheet: sheet.name,
    details: { consistent, inconsistent, unknown, nonEmptyRows: sheet.rows.length },
  };
}
