/**
 * AI Ingest — text thô → mảng câu đã có token/furigana/nghĩa.
 * Chunk văn dài (giữ ranh giới câu) + structured output + validate Zod + retry.
 * docs/11-ai-ingest.md §5-6. KHÔNG lưu DB ở đây (tách trách nhiệm).
 */
import { getConfig } from "@/lib/config";
import { getAIProvider } from "./index";
import type { SentenceData } from "./index";
import {
  INGEST_JSON_SCHEMA,
  INGEST_SYSTEM_PROMPT,
  ingestResultSchema,
} from "./prompts";

/**
 * Chia text theo dòng, gom đến gần `size` ký tự, KHÔNG cắt giữa dòng.
 * Dòng đơn vượt ngưỡng → cắt theo dấu câu Nhật 。！？ và xuống dòng.
 */
export function chunkText(rawText: string, size: number): string[] {
  const lines = rawText.split(/\r?\n/);
  const chunks: string[] = [];
  let cur = "";

  const pushCur = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = "";
  };

  for (const line of lines) {
    if (line.length > size) {
      pushCur();
      // cắt dòng quá dài theo dấu câu Nhật
      const parts = line.split(/(?<=[。！？])/);
      let buf = "";
      for (const p of parts) {
        if ((buf + p).length > size && buf) {
          chunks.push(buf.trim());
          buf = "";
        }
        buf += p;
      }
      if (buf.trim()) cur = buf;
      continue;
    }
    if ((cur + "\n" + line).length > size && cur) {
      pushCur();
    }
    cur = cur ? cur + "\n" + line : line;
  }
  pushCur();
  return chunks.length ? chunks : [rawText.trim()].filter(Boolean);
}

const MAX_RETRY = 2;

async function ingestChunk(chunk: string): Promise<SentenceData[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const temperature = attempt === 0 ? 0.2 : 0;
    const user =
      attempt === 0
        ? chunk
        : `${chunk}\n\n[Nhắc lại] Trả về ĐÚNG JSON theo schema đã cho, đầy đủ mọi trường required.`;
    try {
      const raw = await getAIProvider().complete<unknown>({
        system: INGEST_SYSTEM_PROMPT,
        user,
        jsonSchema: INGEST_JSON_SCHEMA as unknown as Record<string, unknown>,
        schemaName: "ingest_result",
        temperature,
      });
      const parsed = ingestResultSchema.parse(raw);
      return parsed.sentences.map((s) => ({
        original: s.original,
        text: s.text,
        corrected: s.corrected,
        note: s.note ?? "",
        confidence: s.confidence,
        tokens: s.tokens.map((t) => ({
          surface: t.surface,
          reading: t.reading,
          lemma: t.lemma || t.surface,
          pos: t.pos,
          meaning_vi: t.meaning_vi,
          worthLearning: t.worthLearning,
        })),
      }));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Ingest validation failed sau ${MAX_RETRY + 1} lần: ${String(lastErr)}`,
  );
}

/** Ingest toàn bộ text: chunk → gọi AI từng chunk → ghép theo thứ tự. */
export async function ingest(rawText: string): Promise<SentenceData[]> {
  const size = await getConfig<number>("ingest_chunk_size");
  const chunks = chunkText(rawText, size);
  const all: SentenceData[] = [];
  for (const c of chunks) {
    const sentences = await ingestChunk(c);
    all.push(...sentences);
  }
  return all;
}

/** Alias tương thích interface cũ (Phase 1). */
export async function runIngest(text: string): Promise<{ sentences: SentenceData[] }> {
  return { sentences: await ingest(text) };
}
