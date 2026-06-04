/**
 * Repository: notes (nội dung 1 từ đã đào — dùng chung cho mọi loại thẻ).
 * Lọc/ghi theo user_id. docs/03-data-model §2.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import type { Note } from "@/lib/db/schema";

/** Upsert note idempotent theo (user_id, sentence_id, target_word). */
export async function upsertNote(
  userId: string,
  input: {
    sentenceId: string;
    targetWord: string;
    reading: string;
    meaning: string;
  },
): Promise<Note> {
  const existing = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        eq(notes.sentenceId, input.sentenceId),
        eq(notes.targetWord, input.targetWord),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const [row] = await db
    .insert(notes)
    .values({
      userId,
      sentenceId: input.sentenceId,
      targetWord: input.targetWord,
      reading: input.reading,
      meaning: input.meaning,
    })
    .returning();
  return row;
}
