import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx scripts/seed-admin.ts",
  },
  // The CLI (migrate, seed) needs a direct connection; on Neon DATABASE_URL is the pooled
  // (PgBouncer) one and the app keeps using it. Locally there is no DATABASE_URL_UNPOOLED.
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
