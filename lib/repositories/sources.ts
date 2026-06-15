/**
 * Repository: sources + sentences. Mọi truy vấn lọc user_id (docs/02-architecture §6).
 * UI/API không chạm Drizzle trực tiếp — gọi qua đây (chống lock-in).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, notes, sentences, sources } from "@/lib/db/schema";
import type { Sentence, Source } from "@/lib/db/schema";
import type { SentenceData } from "@/lib/ai";

export type NewSourceInput = {
  type: Source["type"];
  title: string;
  rawContent: string;
};

export type SourceWithStats = Source & {
  sentenceCount: number;
  cardCount: number;
};

export async function listSources(userId: string): Promise<Source[]> {
  return db
    .select()
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(sources.createdAt);
}

/**
 * Danh sách tài liệu kèm số câu + số thẻ đã đào (cho Thư viện / Dashboard).
 * Mới nhất lên đầu.
 */
export async function listSourcesWithStats(
  userId: string,
): Promise<SourceWithStats[]> {
  const rows = await db
    .select({
      source: sources,
      sentenceCount: sql<number>`count(distinct ${sentences.id})::int`,
      cardCount: sql<number>`count(distinct ${cards.id})::int`,
    })
    .from(sources)
    .leftJoin(sentences, eq(sentences.sourceId, sources.id))
    .leftJoin(notes, eq(notes.sentenceId, sentences.id))
    .leftJoin(
      cards,
      and(eq(cards.noteId, notes.id), eq(cards.userId, userId)),
    )
    .where(eq(sources.userId, userId))
    .groupBy(sources.id)
    .orderBy(desc(sources.createdAt));
  return rows.map((r) => ({
    ...r.source,
    sentenceCount: r.sentenceCount,
    cardCount: r.cardCount,
  }));
}

export async function getSource(
  userId: string,
  id: string,
): Promise<Source | null> {
  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSentences(sourceId: string): Promise<Sentence[]> {
  return db.select().from(sentences).where(eq(sentences.sourceId, sourceId));
}

/**
 * Tạo 1 source + N sentences trong MỘT transaction (tránh source mồ côi).
 * Trả sourceId.
 */
export async function createSourceWithSentences(input: {
  userId: string;
  type: Source["type"];
  title: string;
  rawContent: string;
  sentences: SentenceData[];
}): Promise<{ sourceId: string; sentenceCount: number }> {
  return db.transaction(async (tx) => {
    const [src] = await tx
      .insert(sources)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        rawContent: input.rawContent,
      })
      .returning({ id: sources.id });

    if (input.sentences.length > 0) {
      await tx.insert(sentences).values(
        input.sentences.map((s) => ({
          sourceId: src.id,
          original: s.original,
          text: s.text,
          corrected: s.corrected,
          note: s.note || null,
          confidence: s.confidence,
          tokens: s.tokens,
          skipped: false,
        })),
      );
    }
    return { sourceId: src.id, sentenceCount: input.sentences.length };
  });
}

/** Source + sentences của ĐÚNG user (null nếu không thuộc user). */
export async function getSourceWithSentences(
  sourceId: string,
  userId: string,
): Promise<{ source: Source; sentences: Sentence[] } | null> {
  const src = await getSource(userId, sourceId);
  if (!src) return null;
  const rows = await getSentences(sourceId);
  return { source: src, sentences: rows };
}

/** Sửa text 1 câu — kiểm quyền qua source.user_id = userId. */
export async function updateSentenceText(
  sentenceId: string,
  userId: string,
  text: string,
): Promise<boolean> {
  const owned = await sentenceBelongsToUser(sentenceId, userId);
  if (!owned) return false;
  await db.update(sentences).set({ text }).where(eq(sentences.id, sentenceId));
  return true;
}

export async function setSentenceSkipped(
  sentenceId: string,
  userId: string,
  skipped: boolean,
): Promise<boolean> {
  const owned = await sentenceBelongsToUser(sentenceId, userId);
  if (!owned) return false;
  await db
    .update(sentences)
    .set({ skipped })
    .where(eq(sentences.id, sentenceId));
  return true;
}

/**
 * Xóa CỨNG 1 câu — kiểm quyền qua source.user_id = userId.
 * Cascade (schema) tự xóa note/card/review sinh ra từ câu này.
 */
export async function deleteSentence(
  sentenceId: string,
  userId: string,
): Promise<boolean> {
  const owned = await sentenceBelongsToUser(sentenceId, userId);
  if (!owned) return false;
  await db.delete(sentences).where(eq(sentences.id, sentenceId));
  return true;
}

/**
 * Xóa CỨNG cả bộ tài liệu của ĐÚNG user.
 * Cascade (schema) tự xóa sentences → notes → cards → reviews.
 * Trả false nếu source không tồn tại hoặc không thuộc user.
 */
export async function deleteSource(
  sourceId: string,
  userId: string,
): Promise<boolean> {
  const res = await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .returning({ id: sources.id });
  return res.length > 0;
}

async function sentenceBelongsToUser(
  sentenceId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: sentences.id })
    .from(sentences)
    .innerJoin(sources, eq(sentences.sourceId, sources.id))
    .where(and(eq(sentences.id, sentenceId), eq(sources.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
