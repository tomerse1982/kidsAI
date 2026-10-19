-- Shared rate-limit counters (fixed window), used when RATE_LIMIT_STORE=postgres.
CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key","window_start")
);
CREATE INDEX "rate_limit_counters_window_start_idx" ON "rate_limit_counters"("window_start");
