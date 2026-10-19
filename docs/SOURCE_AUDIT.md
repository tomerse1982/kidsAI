# Source data audit — מטפסים בסולם | نتسلّق السُلّم

Audit of the three files in `source-files/`, performed before any transformation was written.
Numbers come from the files themselves (openpyxl 3.1.5, PyMuPDF 1.28.2). Re-run the checks with
`npm run test:python` and `npm test` (they assert the facts below against the actual files).

## 1. File inventory

| File | Type | Size | Pages / sheets | Producer metadata |
|---|---|---|---|---|
| `חוברת הדרכות מטפסים בסולם למעונות והגנים.pdf` | PDF 1.7, Hebrew | 22.2 MB | 147 pages (A4 landscape, 595×419 pt) | Canva, title "חוברת הדרכות 9.23", created 2024-11-11 |
| `חוברת ורודה ערבית.pdf` | PDF 1.4, Arabic | 13.2 MB | 145 pages | Canva, title "Copy of חוברת הדרכה ורודה ערבית", created 2026-03-25, **has PDF bookmarks** |
| `טבלה כללית מרוכזת.xlsx` | XLSX | 210 KB | 11 worksheets | sha256 `8b83d9e6df2ad8929e3672030cdc98a68f83e922cc081bdfb9c6566d0633570e` |

## 2. Worksheet inventory

| Sheet | Dimensions | Non-empty rows | Content | Used as |
|---|---|---|---|---|
| `סדרה 1` | A1:E35 | 35 | 1.1–1.4 (34 codes), column C links; column E "לינק ערבית" with **one different link** (1.1.3) | cross-check + inventory |
| `סדרה 2` | A1:C99 | 51 | 2.1–2.7 (50 codes) | cross-check + inventory |
| `סדרה 3` | A1:D75 | 27 | 3.1–3.4 (26 codes) + reviewer notes | cross-check + inventory |
| `סדרה 4` | A1:H105 | 105 | 4.1–4.10 (104 codes); **4.7–4.10 (48 codes) have no links** | cross-check + inventory |
| `סדרה 5` | A1:H100 | 76 | 5.1–5.7 (75 codes); column C = "v" flag, link in column D; 5.6.12–5.6.13 no link | cross-check + inventory |
| `סדרה 6` | A1:D100 | 96 | 6.1–6.9 (95 codes) | cross-check + inventory |
| `סדרה 7` | A1:E109 | 109 | 7.1–7.9 (108 codes); 7.5.13 and 7.8.10 no link | cross-check + inventory |
| `סדרה 8` | A1:C48 | 48 | 8.1–8.5 (47 codes); 8.4.10 no link | cross-check + inventory |
| `רישמה מאוחד ערבית` | A1:C490 | 490 | unified Arabic list, 489 codes, full URLs (hyperlinks) | cross-check + inventory |
| `מיפוי` | A1:K488 | 488 | **the mapping table** — header + 487 data rows, 11 columns | **source of mappings** |
| `Sheet2` | A1:R79 | 36 | AI-drafted tables for 8.3, 8.4, 8.5 in shifted columns, with notes ("מוכן למקבץ הבא!") | audited, not imported |

## 3. `מיפוי` structure (verified)

Columns A–K exactly as specified (אבן דרך … גיל יעד). Findings:

* **Column A is a merged range per milestone** (51 ranges such as `A2:A7`), stored as a *number* (1.1, 4.3 …). Only the anchor cell has a value. 486 of 487 rows are covered by a merge; row 464 (8.3.x) sits just outside its range.
* **Float hazard confirmed in the workbook:** in `סדרה 4` row 93 the milestone "4.10" is stored as `4.1`. Codes are therefore taken from column B (text) and column A is only *validated* (`exact` / `float_equivalent` / `mismatch`).
* Column B: 487 sub-milestone codes, all `n.n.n`, no duplicates.
* Column C: 486 bare 11-character YouTube ids (+ one empty cell: **7.5.13**, whose whole row is empty).
* Column D: `A<code>` (e.g. `A1.1.3`) on all 486 rows — equals the YouTube title of the video (verified for 483/484 videos via oEmbed, see §6).
* Column E: `מלאה: <milestone> תת-סעיף <n>` (436×) and `… (מבוא לסדרה)` (50×); all agree with column B.
* Column J: 27 distinct audience texts, all "גננת …" (staff), some describing guidance for parents.
* Column K: 20 distinct age texts, including trailing spaces and wording that differs from the handbooks (e.g. "לידה עד 3 חודשים" vs. the handbook's "6 שבועות עד 3 חודשים"; series 7 "שנתיים עד שנתיים וחצי" vs. handbook chapter 24–36 months). Kept verbatim as source attributes; the canonical age group comes from the handbook chapter.
* Milestone names (F/G) have 11 milestones with 2–3 spelling variants across rows (e.g. 1.2 "שמיעת צלילים/קולות ומענה להם (גיל 6 שבועות עד 3 חודשים)" vs "שמיעת קולות ומענה להם").

## 4. Verified example (milestone 1.1)

| Row | Sub-milestone | Video | Column E | Hebrew activity (I) |
|---|---|---|---|---|
| 2 | 1.1.1 | pn-JcrmEDA0 | מלאה: 1.1 תת-סעיף 1 | מבוא והגדרת אבן הדרך: מעקב ראייתי של 180 מעלות |
| 3 | 1.1.2 | LG-AImdjzSw | … 2 | סקרנות ועניין בפנים אנושיות |
| 4 | 1.1.3 | **e4RsJQ4yJMo** | … 3 | **שימוש בצעצועים בולטים ומושכי עין** |
| 5 | 1.1.4 | dIzoimC-730 | … 4 | |
| 6 | 1.1.5 | 1xsVhpIbnZI | … 5 | |
| 7 | 1.1.6 | 9Dct0YJ8Z84 | … 6 | |

All six match `רישמה מאוחד ערבית` (rows 2–7) and `סדרה 1`.

## 5. Data-quality issues (all recorded as `import_issues` with sheet/row or page)

| # | Issue | Where | Handling |
|---|---|---|---|
| 1 | Row with code but no video or titles | `מיפוי` row 395 (7.5.13) | not imported; `missing_video` warning |
| 2 | 53 sub-milestones listed in series/unified sheets with no video | 4.7.1–4.10.13 (48), 5.6.12, 5.6.13, 7.5.13, 7.8.10, 8.4.10 | `missing_video_mapping` warnings; milestones 4.7–4.10 have no videos at all |
| 3 | Same video mapped to two sub-milestones | `vtSRPTohxAk` → 4.3.12 and 4.3.13; `kWqFyHByOJs` → 6.3.3 and 6.3.4 | both kept (the sheet asserts them), confidence `needs_review` |
| 4 | Alternative "לינק ערבית" `uNM3WHAm7k0` next to 1.1.3 | `סדרה 1` row 4, column E | **not imported**: its YouTube title is "ابتسامة اجتماعية" (social smile = milestone 1.3), so it is a misplaced link; warning |
| 5 | Unified-list cell shows `6` instead of a URL | `רישמה מאוחד ערבית` row 327 (6.9.1) | the cell's hyperlink target is `vE925fTW0Xs` and matches the mapping; info issue |
| 6 | Unified list has 2 codes not in `מיפוי` | 7.8.10, 8.4.10 (both without video) | covered by #2 |
| 7 | Column A float rendering (4.10 → 4.1) | `סדרה 4` row 93 | codes from column B |
| 8 | YouTube title contradicts column D | `eNs1RlF7knk` mapped to 4.6.5, column D `A4.6.5`, YouTube title `A4.4.7` (4.4.7 is mapped to `A1x57sh0pAM`, title `A4.4.7`) | kept (Excel is authoritative), confidence `needs_review` |
| 9 | `Sheet2` contains draft copies of 8.3/8.4/8.5 | 24 code/video pairs | all 24 identical to `מיפוי`; not imported (info) |
| 10 | Milestone name variants | 11 milestones | first value used as the Excel alternate title; info |

No column-E/column-B mismatch, no column-D/column-B mismatch, no conflict between `מיפוי` and the unified list or series sheets was found for any of the 486 videos.

## 6. Video language

All 486 mapped videos are labelled `ar`, based on source metadata (recorded per video in `videos.language_evidence`): the unified sheet is named "רישמה מאוחד ערבית", column D codes carry the `A` prefix, series 2–8 headers say "ערבית", and the YouTube titles are the `A…` codes on the LinkCaring Child Care channel. The spoken language was **not** verified by watching the videos. A YouTube oEmbed check found all 484 distinct videos available.

**Update 2026-10-13**: the spoken language is now checked from YouTube's automatic-caption (ASR) track
(`npm run videos:check`): 460 Arabic videos verified as Arabic, 24 not checked (YouTube rate limit). See §11 for Hebrew.

## 7. PDF extraction feasibility

| Aspect | Hebrew handbook | Arabic handbook |
|---|---|---|
| Text layer | yes | yes |
| Structure | 8 chapters × (chapter page + intro page), then 2 pages per milestone; 55 milestones; appendix pp. 132–146 | same structure, offset −2 pages; 55 milestones; bookmarks give code → page |
| Milestone page layout | header: code box, title, age badge; sections "מתי זה קורה?", "איך אנחנו יכולים לעזור…", bold-titled activity bullets, "זכרו!" box, curriculum page references + QR | identical, Arabic headings |
| Main extraction problems | Canva `/ActualText` wraps many runs with a bogus single Arabic glyph — default extraction **drops** titles, codes and first sentences (fixed with `TEXT_IGNORE_ACTUALTEXT`); some numbers/punctuation in visual order | text stored in **visual order** using presentation-form glyphs; diacritics positioned separately; a mis-mapped glyph (U+0613) plus stray space inside some words; age badge of 1.1–1.4 repeats the title instead of the age |
| Approach | rebuild every line from glyph x-positions, convert visual → logical order (inverse bidi for RTL, LTR runs kept), attach combining marks to their base glyph, NFKC | same |
| Residual defects after extraction | 3 one-letter tokens in ~18k words (all legitimate, e.g. "כ 20-30") | 33 one-letter tokens in ~20k words (mostly stacked shadda+tanween); ranges such as "8-6" are reproduced as printed |
| Printed page numbers | = PDF index | = PDF index + 2 |
| Image-only pages | chapter title pages, scale charts | chapter title pages, scale charts |

Source content defects found in the PDFs (flagged `needs_review`, text kept verbatim):

* 2.1's intro paragraph is the intro of 5.1 ("expressing needs verbally or by gesture") in **both** editions; 3.2's intro duplicates 2.4's in both; the Hebrew 2.7 intro duplicates 1.4's. Detected automatically (intro matches another milestone's title better than its own).
* Hebrew 2.7: title and age badge merged into one line (split by rule).
* Activity bullet counts differ between editions only for 2.1 (Hebrew 7, Arabic 6 — the Arabic edition has no "הראיה מוגבלת, המשיכו לתרגל" bullet); the Arabic bullets of 2.1 get language-specific codes (`2.1-E8-ar` …) rather than a guessed alignment. All other 54 milestones align 1:1 by position, each position verified by cross-lingual embedding similarity (510 Arabic bullets: 504 aligned, 6 language-specific).

## 8. Developmental domains

The handbook text does not label domains, but the appendix scale chart (Hebrew PDF pages 134 and 136, an embedded image) colours each milestone row by domain (legend: social, language, gross motor, fine motor). Row labels were transcribed (`ingestion/curation/scale_chart_rows.json`, needs editorial review); colours are sampled from the pixels and classified against the chart's own legend by `ingestion/scale_domains.py`. 46 of 55 milestones appear in the chart; 2.3, 4.5, 5.7, 6.8, 6.9, 7.1, 7.6, 7.7 and 7.9 do not and keep no domain.

## 9. Mapping rules adopted

1. The canonical key is column B. Column A (merged range, else validated sequential carry) must agree with B's prefix; disagreement → `conflict`.
2. Column E must reference the same milestone and subsection; column D must equal `A<code>`.
3. Video id from column C (bare id or any YouTube URL form); invalid values are rejected, never repaired.
4. Each row is cross-checked against the unified list and the series sheets; matches → `verified`.
5. Role: "מבוא…" / "(מבוא לסדרה)" → `overview` (mapped as `milestone_overview`); "שיתוף ההורים…" → `parent_guidance`; else `exercise` (`exact_activity`).
6. Mapping key `language:sub-milestone:videoId` → idempotent re-imports; a future Hebrew workbook creates `he:…` keys next to the `ar:…` ones.

## 10. Database relationships (implemented — see `prisma/schema.prisma`)

* One canonical `milestones` row per code (55), age group = handbook chapter.
* `milestone_translations` per (milestone, language, source version): PDF text is primary; Excel milestone names are kept as non-primary alternates.
* `activities` of two kinds: `video_segment` (Excel sub-milestones, 486) and `handbook_exercise` (PDF bullets). They are related through `activity_links` with a stored method and score (never assumed 1:1).
* `activity_video_mappings` keep sheet, row, raw A/B/E/C values, validation notes and confidence.
* `source_references` keep the PDF page index and printed page per language.

## 11. Hebrew video workbook (`טבלה כללית מרוכזת עברית.xlsx`, audited 2026-10-13)

Read with openpyxl (values, hyperlinks, merges); the file is never modified. Sheets: `סדרה 1`…`סדרה 8`
and `מיפוי סרטים ותוכן`.

| Item | Finding | Handling |
|---|---|---|
| Layout | one sheet per series; A = milestone (merged), B = sub-milestone code, E = educator link, K/L/M = parent link, O/P/R = Arabic link | profile `he-series-v1`; headers are checked, a changed header stops that source |
| Rows | 1,078 (code × audience): 1,061 valid (533 educator, 528 parent), 15 empty links, 2 invalid | empty → `missing_video`; invalid → error, not imported |
| Invalid links | `סדרה 7` row 49 and `סדרה 8` row 23, parent column: text "חסר?" | rejected, no URL invented |
| Column A shift | `סדרה 7`: merged milestone labels in A disagree with the codes in B after inserted rows | B is authoritative; rows `needs_review` until the YouTube title check |
| YouTube titles vs mapping | title code differs from the mapped sub-milestone: 55 in another milestone (mostly `סדרה 7` educator), 66 in the same milestone | other milestone → mapping `conflict`, hidden; same milestone → shown at milestone level only |
| Duplicate video ids | AtUBbseNWuQ, OSypaB9L7Hs, ymm3UXBjvys | warning, `needs_review` |
| Not imported | Arabic columns (8), `סדרה 8!F` "לינקים ישנים!!!!" (retired `…XXX` uploads), sheet `מיפוי סרטים ותוכן` (copy of the Arabic mapping) | info issues |
| Availability | 2 Hebrew videos unavailable on YouTube | hidden |
| Spoken language | 14 verified Hebrew by caption track; 1,042 rely on the workbook column (YouTube rate-limited the check) | `source_metadata`; rerun `npm run videos:check -- --only-unverified --concurrency=1 --delay-ms=4000` |
