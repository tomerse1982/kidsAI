# Architecture

## Components

```
source-files/  ──►  ingestion/ (Python)                    ──►  src/server/import/ (TypeScript)        ──►  PostgreSQL + pgvector
  2 PDFs           pdf_extract.py   glyphs → logical lines        handbook/publish.ts  milestones, exercises,
  1 XLSX           pdf_structure.py lines → milestones            page refs, chunks + embeddings
                   scale_domains.py chart colours → domains       workbook/{readers,parse,service}.ts
                   excel_read.py    raw cells + merges            stage → preview → publish (transaction)
                                                                  link-activities.ts  segment ↔ exercise

Next.js app (src/app)                       src/server/knowledge/       src/server/chat/answer.ts      src/server/ai/
  /, /chat, /browse, /milestones/[code],      retrieval.ts (hybrid)       orchestration                  embeddings.ts (local e5)
  /bookmarks, /admin/*                        queries.ts (SQL services)                                  llm.ts (Claude, optional)
  /api/* (route handlers)
```

## Data model (prisma/schema.prisma)

| Table | Purpose |
|---|---|
| `source_documents`, `source_versions` | each file and every imported version (checksum, page count, status); `current_version_id` points at the live one |
| `age_groups` | the 8 handbook chapters; decimal month bounds + `min_age_weeks` (6 weeks), original wording per language |
| `milestones` | one row per canonical code (`1.1` … `8.5`), age group, domain (from the scale chart) |
| `milestone_translations` | per language **and source version**; PDF rows are primary, Excel names are alternates |
| `activities` | `video_segment` (Excel `1.1.3`) and `handbook_exercise` (PDF bullet `1.1-E2`, or `2.1-E8-ar` when the editions differ) |
| `activity_translations` | per language / source version, origin `pdf` or `excel` |
| `activity_links` | derived relation segment ↔ exercise, typed (`exact_activity`, `parent_guidance`, `requires_review`), with method and score |
| `videos` | provider + id (unique), language with evidence, availability, YouTube title |
| `activity_video_mappings` | the Excel mapping: `mapping_key = language:code:videoId` (unique), sheet, row, raw A/B/C/E values, validation notes, confidence, active flag |
| `source_references` | PDF page index + printed page per language, milestone and exercise level |
| `knowledge_chunks` | section-aware retrieval chunks (overview, guidance, exercise, parent guidance, video segment) with `vector(384)` |
| `import_jobs`, `import_row_records`, `import_issues` | staging, per-row preview/action, issues with file / sheet / row / page / severity |
| `users`, `admin_audit_log`, `application_settings` | admin accounts, audited changes, settings |
| `rate_limit_counters` | fixed-window counters shared by all web instances (`RATE_LIMIT_STORE=postgres`) |
| `conversations`, `messages`, `bookmarks` | anonymous educator data keyed by a random client id |

Raw SQL in migration `20261012000100_search_indexes`: HNSW cosine index on embeddings, GIN full-text and
trigram indexes, code-format CHECK constraints, a trigger enforcing that a mapping's activity belongs to its
milestone, and a YouTube-id format check.

## Ingestion

* **PDF** (`ingestion/`): PyMuPDF `rawdict` with `TEXT_IGNORE_ACTUALTEXT`; each line is rebuilt from glyph
  positions (visual order) and converted to logical order; segments on one baseline are split (header boxes).
  Milestone pages are found by header code (Hebrew) or PDF bookmarks (Arabic, validated against headers);
  sections are recognised by their headings; bold lead-ins start exercises. Every page is classified
  (front matter / chapter / milestone / appendix) and a completeness report is produced.
* **Excel**: openpyxl dumps raw cells, hyperlinks and merges (exceljs fallback produces identical output —
  tested). `parse.ts` applies the mapping rules (see SOURCE_AUDIT §9), cross-checks, missing-mapping
  inventory and auxiliary-sheet audit. `service.ts` stages rows with a diff against the database and publishes
  in one transaction; same checksum → same source version → no duplicates.
* **Generic profile**: `importVideoWorkbook(file, language, mappingProfile)`; known layouts are matched to a
  built-in profile, unknown ones get a header-based proposal confirmed by an admin.

## Editorial decisions vs. re-imports

Imports are repeatable, so anything a person decided must not be overwritten by the next import:

| Decision | Stored as | On re-import |
|---|---|---|
| Mapping verdict (verified / needs review) | `validation_notes` entry `admin_review` + `confidence_status` | note kept, admin's confidence kept |
| YouTube title contradicts column D | `validation_notes` entry `youtube_title` | note kept, confidence stays `needs_review` |
| Mapping deactivated | `is_active = false` | never reactivated automatically |
| Handbook text approved / rejected | `content_review_status` (+ summary) | carried over while title, intro and "when" text are unchanged |
| Segment↔exercise link approved / rejected | `activity_links.method = 'manual'` | linker skips manual pairs |

## Retrieval and answering

1. Language by script; age parsed from Hebrew/Arabic expressions (digits, number words, "שנה וחצי", "سنتين") to months.
2. Candidates: pgvector cosine search over current-version chunks **in the question's language**, in-memory
   BM25 with light prefix/suffix handling, explicit codes, domain words, title overlap. Reciprocal-rank fusion
   plus a bonus for dominant keyword matches; aggregation per milestone; age-group and conversation re-ranking.
3. Grounding (evidence, not keyword hits): the best milestone's own passages are re-scored — maximum cosine
   similarity over all its chunks (SQL) and the best single-passage term coverage. Answer only if the question
   has an explicit code, or meaningful words and similarity ≥ 0.90, ≥ 0.86 with coverage ≥ 0.2, ≥ 0.84 with
   coverage ≥ 0.5, or ≥ 0.80 with coverage ≥ 0.6. Otherwise status `not_covered` with the fixed message in the
   selected language and no milestone, video or source. An unindexed handbook gives `source_unavailable`; a
   missing PDF file keeps the citation but marks the link unavailable. The answer carries the quoted evidence
   passages with page and link.
4. SQL: milestone details, exercises (question language only), page references.
5. Claude (`claude-opus-5-5`, server-side refusal fallback, structured JSON) writes 2–4 sentences from the
   excerpts and selects activity codes **from the provided list** (validated); without a key the answer is
   extractive (handbook sentences).
6. SQL: videos of the milestone from the mapping **in the UI language only** (`displayableMappingWhere`:
   active, not `conflict`, mapping and video in the selected language, language `verified` or
   `source_metadata`, not unavailable), deduplicated by video id (`alsoFor` lists the other codes); segments
   hit by retrieval or linked to the chosen exercises are highlighted first; parent versions are shown
   separately. No video in the selected language → an explicit notice, never a substitute.

Display language is `uiLanguage`; the question's script is used only to match the question against the
handbook text in that script (codes are shared between editions), so a Hebrew question with Arabic selected
gets an Arabic answer.

## Performance notes

* Nothing is parsed at request time; chunks, embeddings and references are precomputed.
* The embedding model loads once per process (~1.5 s) and embeds a query in ~20–30 ms. ONNX threads are capped
  (`EMBEDDING_THREADS`, default 4) and spinning disabled — the default thread pool collapsed throughput by ~50×
  on a hybrid-core laptop.
* The BM25 index is cached in memory per set of current source versions (rebuilt automatically after imports).
* Typical end-to-end chat latency without the LLM: 20–60 ms after warm-up.
