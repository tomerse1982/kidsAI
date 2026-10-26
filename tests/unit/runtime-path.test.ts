import path from "node:path";
import { describe, expect, it } from "vitest";
import { runtimePath, storedFilePath } from "@/lib/runtime-path";

describe("runtimePath", () => {
  it("resolves the env value relative to the working directory", () => {
    expect(runtimePath("./data", "./fallback")).toBe(path.resolve("data"));
  });

  it("uses the fallback when the env value is missing or empty", () => {
    expect(runtimePath(undefined, "./source-files")).toBe(path.resolve("source-files"));
    expect(runtimePath("", "./source-files")).toBe(path.resolve("source-files"));
  });

  it("keeps absolute values and appends segments", () => {
    const abs = path.resolve("/srv/uploads");
    expect(runtimePath(abs, "./x", "job-1")).toBe(path.join(abs, "job-1"));
  });
});

describe("storedFilePath", () => {
  // the handbook paths in the database were recorded on Windows
  const expected = path.resolve("source-files", "חוברת ורודה ערבית.pdf");

  it("resolves a Windows-style stored path on any OS", () => {
    expect(storedFilePath("source-files\\חוברת ורודה ערבית.pdf")).toBe(expected);
  });

  it("resolves a POSIX-style stored path the same way", () => {
    expect(storedFilePath("source-files/חוברת ורודה ערבית.pdf")).toBe(expected);
  });
});
