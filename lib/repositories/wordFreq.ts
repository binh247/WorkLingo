/**
 * Repository: tần suất lemma trong nội dung của user (on-the-fly, MVP).
 * TODO(perf): GĐ sau cache vào bảng user_word_freq nếu cần tối ưu (docs/08 §5).
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sentences, sources } from "@/lib/db/schema";
import type { Token } from "@/lib/db/types";

/** Đếm số lần xuất hiện mỗi lemma trong tokens của mọi câu (chưa skip) của user. */
export async function getLemmaFrequency(
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ tokens: sentences.tokens, skipped: sentences.skipped })
    .from(sentences)
    .innerJoin(sources, eq(sentences.sourceId, sources.id))
    .where(and(eq(sources.userId, userId), eq(sentences.skipped, false)));

  const freq = new Map<string, number>();
  for (const r of rows) {
    for (const t of (r.tokens ?? []) as Token[]) {
      if (!t.worthLearning) continue;
      const key = t.lemma || t.surface;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return freq;
}
