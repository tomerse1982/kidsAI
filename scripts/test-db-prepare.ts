/**
 * Creates the integration-test database (TEST_DATABASE_URL), applies migrations and
 * imports the real source files into it with the production pipeline.
 *   npx tsx scripts/test-db-prepare.ts [--skip-import]
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+test[a-z0-9_]*$/.test(dbName)) throw new Error(`refusing to use "${dbName}": test database name must contain "test"`);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  admin.search = "";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
  await client.end();

  const env = { ...process.env, DATABASE_URL: url };
  const bin = (name: string) => path.join("node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
  execFileSync(bin("prisma"), ["migrate", "deploy"], { env, stdio: "inherit", shell: process.platform === "win32" });
  execFileSync(bin("tsx"), ["scripts/seed-admin.ts"], { env, stdio: "inherit", shell: process.platform === "win32" });
  if (!process.argv.includes("--skip-import")) {
    execFileSync(bin("tsx"), ["scripts/import-sources.ts", "--skip-pdf-parse"], { env, stdio: "inherit", shell: process.platform === "win32" });
  }
  console.log(`test database ready: ${dbName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
