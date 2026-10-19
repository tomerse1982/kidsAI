import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type Prisma = PrismaClient;

/**
 * Creates a client. Used by the Next.js server (via db.ts) and by CLI scripts /
 * tests, which must not import the `server-only` guarded module.
 */
export function createPrisma(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 10) });
  return new PrismaClient({ adapter });
}
