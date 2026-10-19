/**
 * Import validation report: runs the SQL verification queries below against
 * DATABASE_URL and writes each query with its actual result to
 * docs/reports/import-validation.md (and .json).
 *   npx tsx scripts/report.ts
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const CURRENT = `(SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)`;

const QUERIES: { title: string; sql: string }[] = [
  { title: "Canonical milestones", sql: `SELECT count(*) AS milestones FROM milestones;` },
  { title: "Milestones per age group", sql: `SELECT ag.code, ag.label_he, count(m.id) AS milestones FROM age_groups ag LEFT JOIN milestones m ON m.age_group_id = ag.id GROUP BY ag.code, ag.label_he, ag.display_order ORDER BY ag.display_order;` },
  { title: "Sub-milestones (Excel video segments) and handbook exercises", sql: `SELECT activity_type, count(*) FROM activities GROUP BY activity_type ORDER BY 1;` },
  { title: "Hebrew content records (current source versions)", sql: `SELECT 'milestone_translations (pdf)' AS kind, count(*) FROM milestone_translations WHERE language='he' AND source_origin='pdf' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'activity_translations (pdf)', count(*) FROM activity_translations WHERE language='he' AND source_origin='pdf' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'activity_translations (excel)', count(*) FROM activity_translations WHERE language='he' AND source_origin='excel' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'knowledge_chunks', count(*) FROM knowledge_chunks WHERE language='he' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'source_references', count(*) FROM source_references WHERE language='he' AND source_version_id IN ${CURRENT};` },
  { title: "Arabic content records (current source versions)", sql: `SELECT 'milestone_translations (pdf)' AS kind, count(*) FROM milestone_translations WHERE language='ar' AND source_origin='pdf' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'activity_translations (pdf)', count(*) FROM activity_translations WHERE language='ar' AND source_origin='pdf' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'activity_translations (excel)', count(*) FROM activity_translations WHERE language='ar' AND source_origin='excel' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'knowledge_chunks', count(*) FROM knowledge_chunks WHERE language='ar' AND source_version_id IN ${CURRENT}
UNION ALL SELECT 'source_references', count(*) FROM source_references WHERE language='ar' AND source_version_id IN ${CURRENT};` },
  { title: "Instructional videos by language", sql: `SELECT language, count(*) AS videos FROM videos GROUP BY language ORDER BY 1;` },
  { title: "Video availability (YouTube oEmbed check)", sql: `SELECT availability_status, count(*), max(last_checked_at) AS last_checked FROM videos GROUP BY 1;` },
  { title: "Active video mappings by language and confidence", sql: `SELECT language, confidence_status, count(*) FROM activity_video_mappings WHERE is_active GROUP BY 1,2 ORDER BY 1,2;` },
  { title: "Mapping traceability (must be 0)", sql: `SELECT count(*) AS mappings_without_source_row FROM activity_video_mappings WHERE source_sheet IS NULL OR source_row_number IS NULL OR raw_sub_milestone_code IS NULL;` },
  { title: "Mappings by relationship type", sql: `SELECT mapping_type, count(*) FROM activity_video_mappings GROUP BY 1 ORDER BY 2 DESC;` },
  { title: "Milestone 1.1 — sub-milestone → video (with Excel source row)", sql: `SELECT a.activity_code, v.provider_video_id, v.canonical_url, m.language, m.confidence_status, m.source_sheet, m.source_row_number, m.raw_correlation_text
FROM activity_video_mappings m JOIN activities a ON a.id = m.activity_id JOIN videos v ON v.id = m.video_id JOIN milestones ms ON ms.id = m.milestone_id
WHERE ms.milestone_code = '1.1' ORDER BY m.source_row_number;` },
  { title: "Milestones without any video mapping", sql: `SELECT m.milestone_code FROM milestones m WHERE NOT EXISTS (SELECT 1 FROM activity_video_mappings x WHERE x.milestone_id = m.id AND x.is_active) ORDER BY m.display_order;` },
  { title: "Sub-milestones listed in the workbook without a video", sql: `SELECT count(*) AS missing_video_mappings FROM import_issues WHERE code = 'missing_video_mapping' AND NOT is_resolved AND import_job_id = (SELECT id FROM import_jobs WHERE job_type='video_workbook' AND status='published' ORDER BY finished_at DESC LIMIT 1);` },
  { title: "Mappings flagged for review", sql: `SELECT a.activity_code, v.provider_video_id, m.confidence_status, m.validation_notes::text AS notes
FROM activity_video_mappings m JOIN activities a ON a.id = m.activity_id JOIN videos v ON v.id = m.video_id
WHERE m.confidence_status <> 'verified' ORDER BY a.activity_code;` },
  { title: "Derived segment ↔ exercise links", sql: `SELECT link_type, method, count(*) FROM activity_links GROUP BY 1,2 ORDER BY 1;` },
  { title: "Development domains (from the scale chart)", sql: `SELECT coalesce(development_domain, '(none)') AS domain, count(*) FROM milestones GROUP BY 1 ORDER BY 1;` },
  { title: "PDF page references for milestone 1.1", sql: `SELECT r.language, sd.document_key, r.pdf_page_index, r.printed_page_number, r.section_heading FROM source_references r JOIN source_versions sv ON sv.id = r.source_version_id JOIN source_documents sd ON sd.id = sv.source_document_id JOIN milestones m ON m.id = r.milestone_id WHERE m.milestone_code='1.1' AND r.activity_id IS NULL ORDER BY 1;` },
  { title: "Milestone translations flagged for editorial review", sql: `SELECT m.milestone_code, t.language, t.content_review_status FROM milestone_translations t JOIN milestones m ON m.id = t.milestone_id WHERE t.source_origin='pdf' AND t.is_primary AND t.content_review_status <> 'unreviewed' ORDER BY 1,2;` },
  { title: "Unresolved import issues by severity", sql: `SELECT severity, count(*) FROM import_issues WHERE NOT is_resolved GROUP BY 1 ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END;` },
  { title: "Unresolved import issues by code", sql: `SELECT severity, code, count(*) FROM import_issues WHERE NOT is_resolved GROUP BY 1,2 ORDER BY 1,3 DESC;` },
  { title: "Source documents and versions", sql: `SELECT sd.document_key, sd.source_type, sd.language, sv.version_number, sv.page_count, sv.import_status, left(sv.checksum, 16) AS checksum FROM source_documents sd JOIN source_versions sv ON sv.source_document_id = sd.id ORDER BY 1, 4;` },
  { title: "Import jobs", sql: `SELECT job_type, status, count(*) FROM import_jobs GROUP BY 1,2 ORDER BY 1,2;` },
];

function toMarkdown(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "_(no rows)_";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => (v === null ? "∅" : v instanceof Date ? v.toISOString().slice(0, 19) : String(v)).replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
  return [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${cols.map((c) => cell(r[c])).join(" | ")} |`)].join("\n");
}

async function main() {
  const url = process.env.DATABASE_URL!;
  const client = new Client({ connectionString: url });
  await client.connect();
  const out: { title: string; sql: string; rows: Record<string, unknown>[] }[] = [];
  for (const q of QUERIES) {
    const res = await client.query(q.sql);
    out.push({ title: q.title, sql: q.sql, rows: res.rows });
  }
  await client.end();
  const db = new URL(url).pathname.slice(1);
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync("docs/reports/import-validation.json", JSON.stringify({ generatedAt: new Date().toISOString(), database: db, results: out }, null, 2));
  const md = [`# Import validation report`, ``, `Generated ${new Date().toISOString()} from database \`${db}\` by \`npm run report\`. Every number below is the literal result of the SQL shown.`, ``,
    ...out.flatMap((o, i) => [`## ${i + 1}. ${o.title}`, "", "```sql", o.sql, "```", "", toMarkdown(o.rows), ""])].join("\n");
  writeFileSync("docs/reports/import-validation.md", md);
  console.log(`wrote docs/reports/import-validation.md (${out.length} queries)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
