import { afterAll, describe, expect, it } from "vitest";
import { memoryRateLimit, postgresRateLimit } from "@/server/rate-limit";
import { createPrisma } from "@/server/prisma-factory";
import { testDb } from "./helpers";

const KEY = `test:${Date.now()}`;
const second = createPrisma(process.env.TEST_DATABASE_URL); // a second "web instance" with its own pool

afterAll(async () => {
  await testDb().$executeRawUnsafe(`DELETE FROM rate_limit_counters WHERE key LIKE 'test:%'`);
  await second.$disconnect();
});

describe("rate limiting", () => {
  it("memory store: sliding window per process", () => {
    const k = `mem:${Date.now()}`;
    const t0 = 1_000_000;
    expect([1, 2, 3].map((i) => memoryRateLimit(k, 2, 60_000, t0 + i).ok)).toEqual([true, true, false]);
    expect(memoryRateLimit(k, 2, 60_000, t0 + 61_000).ok).toBe(true); // window passed
  });

  it("postgres store: a limit is shared exactly across instances under concurrency", async () => {
    const now = Date.now();
    const calls = Array.from({ length: 30 }, (_, i) => postgresRateLimit(i % 2 ? second : testDb(), KEY, 10, 60_000, now));
    const results = await Promise.all(calls);
    expect(results.filter((r) => r.ok)).toHaveLength(10);
    expect(results.filter((r) => !r.ok).every((r) => r.retryAfter > 0 && r.retryAfter <= 60)).toBe(true);
  });

  it("postgres store: a new window starts a new count", async () => {
    const r = await postgresRateLimit(testDb(), KEY, 10, 60_000, Date.now() + 60_000);
    expect(r).toMatchObject({ ok: true, remaining: 9 });
  });
});
