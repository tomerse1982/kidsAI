// Integration tests always run against the dedicated test database, never the dev/prod one.
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL must be set for integration tests (npm run test:db:prepare)");
if (!/test/.test(new URL(process.env.TEST_DATABASE_URL).pathname)) throw new Error("TEST_DATABASE_URL must point to a *test* database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.LLM_PROVIDER = "none"; // deterministic answers; the LLM is covered by the evaluation script
