/**
 * Local multilingual embeddings (multilingual-e5-small, 384 dims, ONNX q8).
 * Runs in-process — no external API, no data leaves the server. Model files are
 * loaded from MODEL_DIR (see scripts/download-model.sh); remote download is
 * disabled so production behaviour never depends on the model hub.
 */
import path from "node:path";

type Extractor = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/multilingual-e5-small";
export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM ?? 384);

let extractorPromise: Promise<Extractor> | null = null;

async function loadExtractor(): Promise<Extractor> {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.localModelPath = path.resolve(process.env.MODEL_DIR ?? "./models") + path.sep;
  env.allowRemoteModels = false;
  env.cacheDir = path.resolve(process.env.MODEL_CACHE_DIR ?? "./.cache/models");
  // ONNX Runtime defaults to one *spinning* worker per logical core. On hybrid
  // (P/E-core) laptops and shared servers that oversubscribes the CPU and makes
  // throughput collapse, so use a small fixed pool without spinning.
  const threads = Number(process.env.EMBEDDING_THREADS ?? 4);
  const fe = await pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "q8",
    session_options: {
      intraOpNumThreads: threads,
      interOpNumThreads: 1,
      extra: { session: { intra_op: { allow_spinning: "0" }, inter_op: { allow_spinning: "0" } } },
    },
  } as never);
  return fe as unknown as Extractor;
}

/** Inference calls are serialised: concurrent runs on one session only contend for the same threads. */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

function extractor(): Promise<Extractor> {
  extractorPromise ??= loadExtractor().catch((err) => {
    extractorPromise = null; // allow a retry after a transient failure
    throw err;
  });
  return extractorPromise;
}

/** e5 models expect "query: " for questions and "passage: " for indexed text. */
export async function embed(texts: string[], kind: "query" | "passage", batchSize = 16): Promise<number[][]> {
  const fe = await extractor();
  // Batches are padded to their longest member: embed in length order, return in input order.
  const order = texts.map((t, i) => [t.length, i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const out: number[][] = new Array(texts.length);
  for (let i = 0; i < order.length; i += batchSize) {
    const idx = order.slice(i, i + batchSize);
    const batch = idx.map((j) => `${kind}: ${texts[j].slice(0, 2000)}`);
    const res = (await serial(() => fe(batch, { pooling: "mean", normalize: true }))).tolist();
    idx.forEach((j, k) => (out[j] = res[k]));
  }
  for (const v of out) {
    if (v.length !== EMBEDDING_DIM) throw new Error(`embedding dim ${v.length} != EMBEDDING_DIM ${EMBEDDING_DIM}`);
  }
  return out;
}

export async function embedOne(text: string, kind: "query" | "passage"): Promise<number[]> {
  return (await embed([text], kind))[0];
}

export function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vectors are L2-normalised
}

/** pgvector literal, e.g. '[0.1,0.2,...]' */
export function toVectorLiteral(v: number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : "0")).join(",")}]`;
}
