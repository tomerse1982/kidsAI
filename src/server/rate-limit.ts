/**
 * Rate limiting with two stores:
 *  - "memory"   (default): sliding window inside one process — fine for a single instance.
 *  - "postgres": fixed window in table rate_limit_counters, shared by every web instance.
 * Select with RATE_LIMIT_STORE. Failures of the shared store fail *open* (the request is
 * served and the error logged) so a database hiccup never locks educators out.
 */
import type { Prisma as Db } from "@/server/prisma-factory";
import { logger } from "@/server/logger";

export interface RateResult { ok: boolean; retryAfter: number; remaining: number }

const buckets = new Map<string, number[]>();

export function memoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000), remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return { ok: true, retryAfter: 0, remaining: limit - hits.length };
}

export async function postgresRateLimit(db: Db, key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateResult> {
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  // atomic increment: concurrent requests on different instances cannot both slip through
  const rows = await db.$queryRawUnsafe<{ count: number }[]>(
    `INSERT INTO rate_limit_counters (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limit_counters.count + 1
     RETURNING count`,
    key, windowStart,
  );
  const count = Number(rows[0]?.count ?? 1);
  if (Math.random() < 0.01) {
    // occasional cleanup of expired windows
    void db.$executeRawUnsafe(`DELETE FROM rate_limit_counters WHERE window_start < $1`, new Date(now - 2 * windowMs)).catch(() => undefined);
  }
  const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return count > limit ? { ok: false, retryAfter, remaining: 0 } : { ok: true, retryAfter: 0, remaining: limit - count };
}

export async function rateLimitWith(db: Db | null, key: string, limit: number, windowMs = 60_000): Promise<RateResult> {
  if (process.env.RATE_LIMIT_STORE === "postgres" && db) {
    try {
      return await postgresRateLimit(db, key, limit, windowMs);
    } catch (err) {
      logger.error({ err: (err as Error).message }, "rate-limit: shared store failed, allowing request");
      return { ok: true, retryAfter: 0, remaining: limit };
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}
