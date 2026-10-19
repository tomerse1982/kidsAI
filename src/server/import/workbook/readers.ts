import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ExcelJS from "exceljs";
import { columnLetter } from "./sheet-utils";
import type { CellValue, RawRow, RawWorkbook } from "./types";

const run = promisify(execFile);

/** Primary reader: ingestion/excel_read.py (openpyxl). */
export async function readWorkbookWithPython(filePath: string): Promise<RawWorkbook> {
  const python = process.env.PYTHON_BIN || "python3";
  const script = path.join(process.cwd(), "ingestion", "excel_read.py");
  const dir = await mkdtemp(path.join(tmpdir(), "kidsai-xlsx-"));
  const out = path.join(dir, "raw.json");
  try {
    await run(python, ["-X", "utf8", script, filePath, out], { maxBuffer: 16 * 1024 * 1024, timeout: 120_000 });
    return JSON.parse(await readFile(out, "utf8")) as RawWorkbook;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function excelCell(value: ExcelJS.CellValue): { v: CellValue; link?: string } {
  if (value === null || value === undefined) return { v: null };
  if (typeof value === "number") return { v: value };
  if (typeof value === "string" || typeof value === "boolean") return { v: value };
  if (value instanceof Date) return { v: value.toISOString() };
  if (typeof value === "object") {
    if ("hyperlink" in value && "text" in value) {
      const t = value.text as unknown;
      const txt =
        typeof t === "string" || typeof t === "number"
          ? t
          : (t as { richText?: { text: string }[] })?.richText?.map((r) => r.text).join("") ?? null;
      return { v: typeof txt === "number" && Number.isInteger(txt) ? txt : txt, link: String(value.hyperlink) };
    }
    if ("richText" in value) return { v: value.richText.map((r) => r.text).join("") };
    if ("result" in value) return excelCell(value.result as ExcelJS.CellValue);
    if ("error" in value) return { v: String(value.error) };
  }
  return { v: String(value) };
}

function compareRange(a: string, b: string): number {
  const key = (s: string) => {
    const m = /^([A-Z]+)(\d+)/.exec(s)!;
    return [m[1], Number(m[2])] as const;
  };
  const [ca, ra] = key(a);
  const [cb, rb] = key(b);
  return ca === cb ? ra - rb : ca < cb ? -1 : 1;
}

/** Fallback reader for environments without Python (pure Node). */
export async function readWorkbookWithExcelJs(filePath: string): Promise<RawWorkbook> {
  const buffer = await readFile(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheets = wb.worksheets.map((ws) => {
    const rows: RawRow[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: CellValue[] = [];
      const links: Record<string, string> = {};
      for (let c = 1; c <= ws.columnCount; c++) {
        const xc = row.getCell(c);
        // exceljs copies a merged range's value into every cell; report only the anchor
        // (same semantics as openpyxl) so merge ranges stay explicit.
        if (xc.isMerged && xc.master.address !== xc.address) {
          cells[c - 1] = null;
          continue;
        }
        const { v, link } = excelCell(xc.value);
        cells[c - 1] = typeof v === "string" && !v.trim() ? v : v;
        if (link) links[columnLetter(c - 1)] = link;
      }
      while (cells.length && (cells[cells.length - 1] === null || cells[cells.length - 1] === undefined)) cells.pop();
      const normalized = cells.map((v) => (v === undefined ? null : typeof v === "number" && Number.isInteger(v) ? v : v));
      if (normalized.every((v) => v === null || (typeof v === "string" && !v.trim()))) return;
      rows.push({ r: rowNumber, cells: normalized, ...(Object.keys(links).length ? { links } : {}) });
    });
    const merges = [...((ws.model as { merges?: string[] }).merges ?? [])].sort(compareRange);
    return { name: ws.name, maxRow: ws.rowCount, maxCol: ws.columnCount, merges, rows };
  });
  return {
    reader: "exceljs",
    file: path.basename(filePath),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sheets,
  };
}

export async function readWorkbook(filePath: string): Promise<RawWorkbook> {
  if ((process.env.WORKBOOK_READER ?? "python") === "exceljs") return readWorkbookWithExcelJs(filePath);
  try {
    return await readWorkbookWithPython(filePath);
  } catch (err) {
    // Python missing in this environment: fall back, but say so in the result.
    const wb = await readWorkbookWithExcelJs(filePath);
    return { ...wb, reader: `exceljs (python reader failed: ${(err as Error).message.split("\n")[0]})` };
  }
}
