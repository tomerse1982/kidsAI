import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";

export const runtime = "nodejs";

/** Streams the current version of a handbook PDF inline, so links can open it at #page=N. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ key: string }> }) => {
  const { key } = await ctx.params;
  if (!/^handbook-(he|ar)$/.test(key)) return jsonError(404, "not_found");
  const doc = await prisma.sourceDocument.findUnique({ where: { documentKey: key } });
  if (!doc || doc.sourceType !== "PDF") return jsonError(404, "not_found");
  // only files inside the configured source / upload directories are ever served
  // paths recorded on Windows use "\": normalise so the same database works on a Linux host
  const file = path.resolve(doc.storagePath.replace(/[\\/]/g, path.sep));
  const allowed = [path.resolve(process.env.SOURCE_FILES_DIR ?? "./source-files"), path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads")];
  if (!allowed.some((dir) => file.startsWith(dir + path.sep))) return jsonError(404, "not_found");
  const info = await stat(file);
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(info.size),
      "Content-Disposition": `inline; filename="${key}.pdf"`,
      "Cache-Control": "public, max-age=3600",
      ETag: `"${doc.checksum.slice(0, 16)}"`,
    },
  });
});
