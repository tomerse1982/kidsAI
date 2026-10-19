import type { CellValue, RawRow } from "./types";

export function columnIndex(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function cell(row: RawRow, letter: string | undefined): CellValue {
  if (!letter) return null;
  return row.cells[columnIndex(letter)] ?? null;
}

/** Cell as trimmed text (null when empty). Numbers keep their JS rendering (1.1 -> "1.1"). */
export function text(row: RawRow, letter: string | undefined): string | null {
  const v = cell(row, letter);
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

/** Hyperlink target if present, else the cell text. */
export function linkOrText(row: RawRow, letter: string | undefined): string | null {
  if (!letter) return null;
  return row.links?.[letter.toUpperCase()] ?? text(row, letter);
}
