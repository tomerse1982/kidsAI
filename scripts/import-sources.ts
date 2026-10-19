/**
 * Full source ingestion (idempotent):
 *   1. PDF -> positioned lines -> milestone structure   (Python / PyMuPDF)
 *   2. publish Hebrew + Arabic handbooks                  (milestones, exercises, references, chunks)
 *   3. stage + publish the Arabic video workbook          (openpyxl raw read -> shared TS rules)
 *   4. derive segment <-> exercise links
 *
 * Usage: npx tsx scripts/import-sources.ts [--skip-pdf-parse] [--only=he|ar|xlsx|xlsx-he]
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { sha256File } from "@/server/import/common";
import { applyScaleDomains } from "@/server/import/domains";
import { publishHandbook } from "@/server/import/handbook/publish";
import type { HandbookStructure } from "@/server/import/handbook/types";
import { linkSegmentsToExercises } from "@/server/import/link-activities";
import { existsSync } from "node:fs";
import { ARABIC_MAPPING_V1, HEBREW_SERIES_V1 } from "@/server/import/workbook/profiles";
import { importVideoWorkbook } from "@/server/import/workbook/service";
import { createPrisma } from "@/server/prisma-factory";

const SRC = process.env.SOURCE_FILES_DIR ?? "./source-files";
const OUT = "./ingestion/output";
const PY = process.env.PYTHON_BIN ?? "python3";
export const SOURCES = {
  he: { pdf: path.join(SRC, "חוברת הדרכות מטפסים בסולם למעונות והגנים.pdf"), key: "handbook-he" },
  ar: { pdf: path.join(SRC, "חוברת ורודה ערבית.pdf"), key: "handbook-ar" },
  xlsx: path.join(SRC, "טבלה כללית מרוכזת.xlsx"),
  xlsxHe: path.join(SRC, "טבלה כללית מרוכזת עברית.xlsx"),
};

export function parsePdf(pdf: string, lang: "he" | "ar"): HandbookStructure {
  mkdirSync(OUT, { recursive: true });
  const lines = path.join(OUT, `${lang}_lines.json`);
  const structure = path.join(OUT, `${lang}_structure.json`);
  execFileSync(PY, ["-X", "utf8", "ingestion/pdf_extract.py", pdf, lang, lines], { stdio: "inherit" });
  execFileSync(PY, ["-X", "utf8", "ingestion/pdf_structure.py", lines, pdf, lang, structure], { stdio: "inherit" });
  return JSON.parse(readFileSync(structure, "utf8"));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];
  const db = createPrisma();
  const t0 = Date.now();
  try {
    for (const lang of ["he", "ar"] as const) {
      if (only && only !== lang) continue;
      const src = SOURCES[lang];
      const structure = args.has("--skip-pdf-parse")
        ? (JSON.parse(readFileSync(path.join(OUT, `${lang}_structure.json`), "utf8")) as HandbookStructure)
        : parsePdf(src.pdf, lang);
      const res = await publishHandbook(db, { structure, filePath: src.pdf, checksum: await sha256File(src.pdf), documentKey: src.key });
      console.log(`[${lang}] handbook published`, JSON.stringify(res));
    }
    if (!only || only === "xlsx") {
      const res = await importVideoWorkbook(db, SOURCES.xlsx, "ar", ARABIC_MAPPING_V1, { documentKey: "video-workbook-ar" });
      console.log("[xlsx] staged", JSON.stringify(res.staged.status === "staged" ? { stats: res.staged.parse.stats, actions: res.staged.actions } : res.staged));
      console.log("[xlsx] published", JSON.stringify(res.published));
    }
    if (!only || only === "xlsx-he") {
      if (!existsSync(SOURCES.xlsxHe)) {
        console.log(`[xlsx-he] NOT IMPORTED: ${SOURCES.xlsxHe} not found — no Hebrew videos will be shown`);
      } else {
        const res = await importVideoWorkbook(db, SOURCES.xlsxHe, "he", HEBREW_SERIES_V1, { documentKey: "video-workbook-he" });
        console.log("[xlsx-he] staged", JSON.stringify(res.staged.status === "staged" ? { stats: res.staged.parse.stats, actions: res.staged.actions } : res.staged));
        console.log("[xlsx-he] published", JSON.stringify(res.published));
      }
    }
    if (!only || only === "he") {
      const out = path.join(OUT, "scale_domains.json");
      execFileSync(PY, ["-X", "utf8", "ingestion/scale_domains.py", SOURCES.he.pdf, out], { stdio: "inherit" });
      console.log("[domains]", JSON.stringify(await applyScaleDomains(db, out, path.basename(SOURCES.he.pdf))));
    }
    console.log("[links]", JSON.stringify(await linkSegmentsToExercises(db)));
    console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("import-sources")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
