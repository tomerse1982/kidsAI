# מטפסים בסולם | نتسلّق السُلّم

Bilingual (Hebrew / Arabic) educational assistant for early-childhood staff. Educators ask a question;
the app finds the relevant developmental milestone in the handbook, shows the handbook's guidance and
exercises, the instructional videos mapped to that milestone in the Excel workbook, and the exact page
of the handbook it came from.

```
question → language + age → hybrid retrieval (pgvector + BM25) → milestone (PDF)
        → exercises + page references (PDF, SQL) → videos (Excel mapping, SQL) → short explanation (Claude or extractive)
```

**The model never chooses videos.** Retrieval identifies milestones/activities; videos come only from
`activity_video_mappings`, which mirror the workbook row by row (`source_sheet`, `source_row_number`).

* `docs/SOURCE_AUDIT.md` — audit of the three source files (Phase 1)
* `docs/ARCHITECTURE.md` — data model, pipelines, retrieval
* `docs/reports/import-validation.md` — SQL verification queries with their actual results (`npm run report`)
* `docs/reports/eval-report.md` — retrieval / answer evaluation (`npm run eval`)

## Requirements

| Component | Version used | Notes |
|---|---|---|
| Node.js | 24 (≥ 22) | |
| PostgreSQL | 16 with **pgvector ≥ 0.7** and `pg_trgm` | any managed Postgres with pgvector (Neon, Supabase, RDS, Cloud SQL) |
| Python | 3.12 (≥ 3.11) | `pip install -r ingestion/requirements.txt` (PyMuPDF, openpyxl, pytest) — needed by the import worker |
| Embedding model | `Xenova/multilingual-e5-small` (ONNX q8, 118 MB) | `npm run model:download`, runs locally, no API |
| Claude (optional) | `claude-opus-5-5` | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`; without it answers are extractive |

## Local setup

```bash
npm install                      # also runs prisma generate
cp .env.example .env             # fill DATABASE_URL, SESSION_SECRET, ADMIN_* (and ANTHROPIC_API_KEY if available)
pip install -r ingestion/requirements.txt
npm run model:download           # embedding model into ./models (sha-verified by the hub)
npm run db:migrate               # creates tables, pgvector/pg_trgm extensions, HNSW + GIN indexes
npm run db:seed                  # admin account from ADMIN_EMAIL / ADMIN_PASSWORD + default settings
npm run import:sources           # PDFs + workbook → database (idempotent, ~3-8 min)
npm run videos:check             # optional: YouTube availability + title cross-check
npm run dev                      # http://localhost:3000   (admin: /admin)
```

Keep the database and `storage/` outside folders synced by OneDrive/Dropbox: sync clients lock and
rewrite files under write load.

### Running PostgreSQL + pgvector without admin rights (Windows, what this repo was developed on)

```bash
micromamba create -p %LOCALAPPDATA%\kidsai\pgenv -c conda-forge postgresql pgvector
initdb -D %LOCALAPPDATA%\kidsai\pgdata -U postgres -A scram-sha-256 --pwfile=<file>
pg_ctl -D %LOCALAPPDATA%\kidsai\pgdata -l pg.log start      # port set in postgresql.conf (5433 here)
```

## Commands

| Command | What it does |
|---|---|
| `npm run import:sources [-- --skip-pdf-parse] [-- --only=he\|ar\|xlsx\|xlsx-he]` | full ingestion: PDF extraction (Python) → publish handbooks → stage + publish workbook → scale-chart domains → segment↔exercise links |
| `npm run import:worker` | import worker for admin uploads (PDF parsing, approved publications) |
| `npm run videos:check [-- --only-unverified --concurrency=1 --delay-ms=4000 --language=he --skip-asr --limit=N]` | per video: oEmbed availability, YouTube title code vs the mapped sub-milestone (`match` / `same_milestone` → shown at milestone level / `different` → mapping `conflict`, hidden), and the spoken language from YouTube's automatic-caption track (`verified` / `conflict`). Admin decisions are never overwritten. YouTube rate-limits the caption check; rerun with `--only-unverified` and a delay — incomplete checks are reported, never guessed |
| `npm run report` | runs the SQL verification queries, writes `docs/reports/import-validation.md` |
| `npm run eval` | evaluation set (`tests/eval/questions.json`), writes `docs/reports/eval-report.md` |
| `npm run smoke` | post-deploy smoke test against `BASE_URL` (UTF-8 Hebrew/Arabic questions, PDF route) |
| `npm run icons` | renders the PNG app icons (192/512/maskable/apple-touch) from the SVGs |
| `npm run db:purge` | deletes conversations older than `chat.message_retention_days` (default 90) |
| `npm test` / `npm run test:integration` / `npm run test:python` / `npm run test:e2e` | unit / DB integration / Python ingestion / Playwright mobile E2E |
| `npm run test:db:prepare` | creates + migrates + populates the separate test database (`TEST_DATABASE_URL`) |

## Video workbooks and strict language

Two workbooks are imported, each mapping traceable to sheet + column + row:

* `טבלה כללית מרוכזת.xlsx` — Arabic videos (sheet `מיפוי`, profile `ar-mapping-v1`).
* `טבלה כללית מרוכזת עברית.xlsx` — Hebrew videos (profile `he-series-v1`): sheets `סדרה 1`…`סדרה 8`,
  column E "לינק יוטיוב מעונות" (educators) and the "לינק יוטיוב הורים" column (parents, K/L/M by sheet).
  The Arabic columns, `סדרה 8!F` ("לינקים ישנים") and the copied sheet `מיפוי סרטים ותוכן` are audited but not imported.
  Non-links (e.g. "חסר?") are rejected and reported; nothing is substituted.

**The UI language selector is the only source of truth for display language.** Answers, handbook excerpts,
citations and videos are shown only in the selected language. A video is shown only if its mapping and the
video are in that language, its language is `verified` (automatic-caption track) or `source_metadata` (the
workbook column says so) — never inferred from title, URL or filename — it is available, and the mapping is
not in `conflict`. When nothing exists in the selected language the app says so instead of showing another
language. Switching language on the chat screen re-asks the last question in the new language and discards
the old answer.

### Adding another video workbook

1. Admin → **ייבוא קבצים** → type "טבלת סרטונים (Excel)", language **עברית**, upload.
2. If the layout is not a known profile, the column-mapping screen shows a proposal from the headers; confirm/adjust it.
3. Review the staged preview (insert / update / unchanged / conflict per row, issues with sheet + row).
4. Tick the confirmation and publish. The worker publishes in one transaction; mappings are created as
   `he:<sub-milestone>:<video>` next to the Arabic ones — Arabic mappings are never modified or deleted.
5. Videos appear only in the language they were imported for; there is no cross-language fallback.

The same flow (with language ערבית) imports an updated Arabic workbook; mappings that disappeared from the
new file are reported, not deleted — the optional "deactivate replaced" switch only deactivates.

## Editorial review (admin → תור בדיקה)

Items the importers cannot decide on their own wait in one queue: handbook texts flagged as source defects,
video mappings with conflicting evidence, and derived video↔exercise links marked `requires_review`.
Each decision needs a reason and is written to the audit log. **Decisions survive re-imports**: an admin's
verdict on a mapping and the YouTube title check are kept as validation notes; approved/rejected handbook texts
keep their status while the text is unchanged (changed text returns to review); decided links are stored as
manual links that the automatic linker never overrides. A rejected text is kept verbatim but not shown as the
explanation.

## Deployment

The app is a standard Next.js 16 server (`npm run build && npm start`) plus a worker process
(`npm run import:worker`). Recommended layout:

* **Web**: container or VM with Node 24, `MODEL_DIR` containing the embedding model, env vars from
  `.env.example`. Serverless platforms work for the web tier if the model files are bundled and the
  function has ≥ 1 GB memory; the worker must run on a host with Python.
* **Worker**: same image + Python requirements; set `IMPORT_WORKER_MODE=external` on the web tier so uploads are
  processed only by the worker.
* **Database**: PostgreSQL 15+ with pgvector; run `npm run db:migrate` on deploy, `npm run db:seed` once.
* **Uploads / sources**: `SOURCE_FILES_DIR` and `UPLOAD_DIR` on persistent storage shared by web and worker
  (the PDF route serves files only from these directories).
* Put the app behind HTTPS (HSTS and a strict CSP are already sent). With more than one web instance set
  `RATE_LIMIT_STORE=postgres` so chat and login limits are shared (table `rate_limit_counters`, atomic
  counters; if the store fails, requests are allowed and the error is logged).
* Migrations: `prisma migrate diff` / `migrate dev` will propose dropping the HNSW and trigram indexes created
  in raw SQL (Prisma cannot represent them). Never accept those DROP statements; write new migrations by hand
  or review the generated SQL.
* After each deploy: `BASE_URL=https://… npm run smoke`.

## Security & privacy

* Admin: bcrypt-hashed passwords, HS256 session cookie (httpOnly, SameSite=Strict, 8 h), roles
  `viewer` / `editor` / `admin` checked server-side on every admin page and API route; login rate-limited;
  every admin change is written to `admin_audit_log` with before/after values and a reason.
* Educators are anonymous (random device id cookie). The schema has no field for child names or
  identifiers; questions are never logged (only a hash and length); conversations can be deleted by the
  user and are purged after the retention period.
* Uploads are validated by content (PDF / OOXML magic bytes), size-limited and stored under random paths.
* API keys stay server-side; the embedding model runs locally (no question text leaves the server unless
  Claude is enabled).
* The UI states that guidance is educational and not a developmental assessment; concern/safety wording
  in a question adds a professional-assessment note.
