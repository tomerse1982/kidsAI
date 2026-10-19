import pino from "pino";

/**
 * Structured logger. Free text typed by educators (questions, messages) can
 * contain details about children, so it is never logged: callers log lengths,
 * hashes and ids only, and the redaction list below is a second line of defence.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { app: "kidsai" },
  redact: {
    paths: [
      "question", "*.question", "content", "*.content", "message", "*.messageText",
      "password", "*.password", "passwordHash", "*.passwordHash",
      "req.headers.cookie", "req.headers.authorization", "apiKey", "*.apiKey",
    ],
    censor: "[redacted]",
  },
});
