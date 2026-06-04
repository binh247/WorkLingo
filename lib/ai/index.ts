/**
 * lib/ai — interface chung (chống lock-in provider). docs/02-architecture §2.
 * Chỉ openai.ts biết SDK OpenAI; đổi provider chỉ thêm file mới.
 */
import type { Token } from "@/lib/db/types";

/** 1 câu sau AI Ingest (khớp docs/03-data-model §3 / 11 §3). */
export type SentenceData = {
  original: string;
  text: string;
  corrected: boolean;
  note: string;
  confidence: "high" | "medium" | "low";
  tokens: Token[];
};

export type CompleteOptions = {
  system: string;
  user: string;
  /** JSON Schema cho structured output (response_format json_schema). */
  jsonSchema: Record<string, unknown>;
  /** Tên schema (OpenAI yêu cầu). */
  schemaName?: string;
  temperature?: number;
};

export interface AIProvider {
  /** Gọi model, ép trả JSON đúng jsonSchema, trả object đã parse. */
  complete<T = unknown>(opts: CompleteOptions): Promise<T>;
}

import { OpenAIProvider } from "./openai";

let _provider: AIProvider | null = null;
export function getAIProvider(): AIProvider {
  if (!_provider) _provider = new OpenAIProvider();
  return _provider;
}

export { runIngest } from "./ingest";
