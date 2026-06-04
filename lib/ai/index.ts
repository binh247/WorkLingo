/**
 * lib/ai — interface chung (chống lock-in provider). docs/02-architecture §2.
 * Phase 1: chỉ định nghĩa interface + type. Cài đặt thật (gpt-4o) ở Phase 2.
 */
import type { Token } from "@/lib/db/types";

/** 1 câu sau AI Ingest (khớp docs/03-data-model §3). */
export type SentenceData = {
  original: string;
  text: string;
  corrected: boolean;
  note?: string;
  confidence: "high" | "medium" | "low";
  tokens: Token[];
};

export type IngestResult = {
  sentences: SentenceData[];
};

export interface AIProvider {
  /** text thô → JSON dữ liệu cuối (câu + token + furigana + nghĩa). */
  ingest(text: string): Promise<IngestResult>;
}

export { runIngest } from "./ingest";
