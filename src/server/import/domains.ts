/**
 * Applies developmental domains derived from the handbook's colour-coded scale
 * chart (ingestion/scale_domains.py). Milestones that do not appear in the chart
 * keep a NULL domain — nothing is inferred for them.
 */
import { readFileSync } from "node:fs";
import type { Prisma as Db } from "@/server/prisma-factory";
import { writeAudit } from "./common";

export const DOMAINS = ["social", "language", "gross_motor", "fine_motor"] as const;
export type Domain = (typeof DOMAINS)[number];

interface ScaleDomainsFile {
  domains: Record<string, { domain: Domain; rows: [number, number][]; match: string; min_margin: number }>;
  problems: string[];
}

export async function applyScaleDomains(db: Db, jsonPath: string, sourceFile: string) {
  const data = JSON.parse(readFileSync(jsonPath, "utf8")) as ScaleDomainsFile;
  if (data.problems.length) throw new Error(`scale-domain extraction has problems, not applied: ${data.problems.join("; ")}`);
  const milestones = await db.milestone.findMany({ select: { id: true, milestoneCode: true, developmentDomain: true } });
  let updated = 0;
  const missing: string[] = [];
  await db.$transaction(async (tx) => {
    for (const m of milestones) {
      const d = data.domains[m.milestoneCode];
      if (!d) {
        missing.push(m.milestoneCode);
        continue;
      }
      if (m.developmentDomain !== d.domain) {
        await tx.milestone.update({ where: { id: m.id }, data: { developmentDomain: d.domain } });
        await writeAudit(tx, { action: "milestone.set_domain", entityType: "milestone", entityId: m.id, before: { domain: m.developmentDomain }, after: { domain: d.domain, chartRows: d.rows, match: d.match } });
        updated++;
      }
    }
    await tx.importIssue.deleteMany({ where: { code: "domain_not_in_scale_chart" } });
    if (missing.length) {
      await tx.importIssue.create({
        data: {
          sourceFile, severity: "info", code: "domain_not_in_scale_chart",
          message: `${missing.length} milestones do not appear in the colour-coded scale chart; their domain is left empty: ${missing.join(", ")}`,
          details: { milestones: missing },
        },
      });
    }
  });
  return { updated, withDomain: milestones.length - missing.length, missing };
}
