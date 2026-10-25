import path from "node:path";

/**
 * Absolute path of a runtime data directory (source files, uploads, model files) taken from an
 * env var, relative to the working directory. These are data, not code: the comment keeps the
 * bundler from tracing the whole project into the server output for a dynamic path.
 */
export function runtimePath(value: string | undefined, fallback: string, ...segments: string[]): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), value || fallback, ...segments);
}
