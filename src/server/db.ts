import "server-only";
import { createPrisma, type Prisma as PrismaClientType } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

/** One client (and pool) per server process; survives Next.js dev hot reloads. */
export const prisma: PrismaClientType = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
