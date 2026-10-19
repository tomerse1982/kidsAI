import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

export type UploadKind = "pdf" | "xlsx";

/** Validates type by magic bytes (not by the client-supplied name or MIME type) and stores the file. */
export async function storeUpload(file: File, kind: UploadKind): Promise<{ storagePath: string; originalFilename: string; checksum: string; size: number }> {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) throw new UploadError(`file must be between 1 byte and ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  const buf = Buffer.from(await file.arrayBuffer());
  const isPdf = buf.subarray(0, 5).toString("latin1") === "%PDF-";
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04; // xlsx = OOXML zip
  if (kind === "pdf" && !isPdf) throw new UploadError("not a PDF file");
  if (kind === "xlsx" && !(isZip && buf.includes(Buffer.from("xl/workbook")))) throw new UploadError("not an .xlsx workbook");
  // keep letters (any script), digits, dot, dash, underscore and spaces; never trust path parts
  const base = path.basename(file.name).normalize("NFC").replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120) || `upload.${kind}`;
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads", randomUUID());
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, base.endsWith(`.${kind}`) ? base : `${base}.${kind}`);
  await writeFile(storagePath, buf, { flag: "wx" });
  return { storagePath, originalFilename: base, checksum: createHash("sha256").update(buf).digest("hex"), size: buf.length };
}

export class UploadError extends Error {}
