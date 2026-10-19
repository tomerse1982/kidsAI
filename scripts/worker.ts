/**
 * Import worker. Runs a single job (`--job=<id>`) or polls for queued/approved jobs.
 *   npx tsx scripts/worker.ts            # poll every 10 s
 *   npx tsx scripts/worker.ts --once     # process what is pending, then exit
 */
import "dotenv/config";
import { runJobs } from "@/server/import/jobs";
import { createPrisma } from "@/server/prisma-factory";

async function main() {
  const db = createPrisma();
  const job = process.argv.find((a) => a.startsWith("--job="))?.split("=")[1];
  try {
    if (job || process.argv.includes("--once")) {
      await runJobs(db, job);
      return;
    }
    for (;;) {
      await runJobs(db);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
