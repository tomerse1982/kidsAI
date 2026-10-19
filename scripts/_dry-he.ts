import "dotenv/config";
import { readWorkbookWithPython } from "@/server/import/workbook/readers";
import { matchBuiltinProfile } from "@/server/import/workbook/profiles";
import { parseAnyWorkbook } from "@/server/import/workbook/service";
async function main() {
  const raw = await readWorkbookWithPython("source-files/טבלה כללית מרוכזת עברית.xlsx");
  const profile = matchBuiltinProfile(raw)!;
  console.log("profile:", profile?.id);
  const r = parseAnyWorkbook(raw, "he", profile);
  console.log(r.stats);
  const by: Record<string, number> = {};
  for (const i of r.issues) by[`${i.severity}:${i.code}`] = (by[`${i.severity}:${i.code}`] ?? 0) + 1;
  console.log(by);
  for (const i of r.issues.filter((i) => !["missing_video", "excluded_column"].includes(i.code))) console.log(" ", i.severity, i.code, i.worksheet, i.rowNumber ?? "", i.message.slice(0, 150));
  console.log("missing:", r.missingMappings.map((m) => m.code).join(" "));
  console.log("1.1:", r.rows.filter((x) => x.milestoneCode === "1.1").map((x) => `${x.subMilestoneCode}/${x.audience}=${x.videoId}`).join(" "));
}
main();
