/**
 * Repository: cards. LUÔN lọc userId. getDue hoàn thiện ở Phase 4 (SRS).
 */
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, notes, reviews, sentences } from "@/lib/db/schema";
import type { Card, Note, Sentence } from "@/lib/db/schema";
import { schedule, type FsrsState, type Rating } from "@/lib/srs";

export type CardType = Card["type"];
export type DueCard = { card: Card; note: Note; sentence: Sentence };

const dueExpr = sql`(${cards.fsrsState} ->> 'due')`;

/** Thẻ đến hạn của user (due<=now, chưa suspend) kèm note + sentence. */
export async function getDueCards(
  userId: string,
  now: Date = new Date(),
  limit = 50,
): Promise<DueCard[]> {
  const rows = await db
    .select({ card: cards, note: notes, sentence: sentences })
    .from(cards)
    .innerJoin(notes, eq(cards.noteId, notes.id))
    .innerJoin(sentences, eq(notes.sentenceId, sentences.id))
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.suspended, false),
        lte(dueExpr, now.toISOString()),
      ),
    )
    .orderBy(asc(dueExpr))
    .limit(limit);
  return rows;
}

export async function countDueCards(
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.suspended, false),
        lte(dueExpr, now.toISOString()),
      ),
    );
  return rows[0]?.n ?? 0;
}

/** Chấm 1 thẻ: tính state mới (ts-fsrs), UPDATE fsrs_state + INSERT review (transaction). */
export async function applyReview(
  userId: string,
  cardId: string,
  rating: Rating,
  now: Date = new Date(),
): Promise<{ newDue: Date }> {
  return db.transaction(async (tx) => {
    const [c] = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.id, cardId)))
      .limit(1);
    if (!c) throw new Error("Thẻ không tồn tại hoặc không thuộc user");

    const current = (c.fsrsState ?? {}) as unknown as FsrsState;
    const { state, due } = schedule(current, rating, now);

    await tx
      .update(cards)
      .set({ fsrsState: state as unknown as Record<string, unknown> })
      .where(eq(cards.id, cardId));
    await tx
      .insert(reviews)
      .values({ cardId, rating, reviewedAt: now });
    return { newDue: due };
  });
}

export async function saveCard(
  userId: string,
  card: Omit<typeof cards.$inferInsert, "userId">,
): Promise<Card> {
  const rows = await db
    .insert(cards)
    .values({ ...card, userId })
    .returning();
  return rows[0];
}

export async function suspendCard(
  userId: string,
  cardId: string,
  suspended: boolean,
): Promise<void> {
  await db
    .update(cards)
    .set({ suspended })
    .where(and(eq(cards.userId, userId), eq(cards.id, cardId)));
}

/** Loại thẻ đã tồn tại cho 1 note (để không tạo trùng khi lưu lại). */
export async function getCardTypesForNote(
  userId: string,
  noteId: string,
): Promise<Set<CardType>> {
  const rows = await db
    .select({ type: cards.type })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.noteId, noteId)));
  return new Set(rows.map((r) => r.type));
}

/** Tạo cards cho note theo các loại còn thiếu. fsrsState do caller cung cấp (ts-fsrs). */
export async function createCardsForNote(
  userId: string,
  noteId: string,
  types: CardType[],
  fsrsState: Record<string, unknown>,
): Promise<number> {
  const existing = await getCardTypesForNote(userId, noteId);
  const toCreate = types.filter((t) => !existing.has(t));
  if (toCreate.length === 0) return 0;
  await db.insert(cards).values(
    toCreate.map((type) => ({
      noteId,
      userId,
      type,
      fsrsState,
      suspended: false,
    })),
  );
  return toCreate.length;
}

export type CardListItem = {
  id: string;
  type: CardType;
  targetWord: string;
  reading: string;
  meaning: string;
  due: string | null;
  suspended: boolean;
  createdAt: Date;
};

/** Liệt kê toàn bộ thẻ của user (kèm từ/nghĩa/ngày tới hạn) cho trang "Thẻ của tôi". */
export async function listCardsWithNote(
  userId: string,
  limit = 500,
): Promise<CardListItem[]> {
  const rows = await db
    .select({
      id: cards.id,
      type: cards.type,
      targetWord: notes.targetWord,
      reading: notes.reading,
      meaning: notes.meaning,
      due: sql<string | null>`(${cards.fsrsState} ->> 'due')`,
      suspended: cards.suspended,
      createdAt: cards.createdAt,
    })
    .from(cards)
    .innerJoin(notes, eq(cards.noteId, notes.id))
    .where(eq(cards.userId, userId))
    .orderBy(sql`${cards.createdAt} DESC`)
    .limit(limit);
  return rows;
}

/** Đếm số card theo từng loại (cho trang /settings). */
export async function countCardsByType(
  userId: string,
): Promise<Map<CardType, number>> {
  const rows = await db
    .select({ type: cards.type, n: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.userId, userId))
    .groupBy(cards.type);
  return new Map(rows.map((r) => [r.type, r.n]));
}

/**
 * Suspend/khôi phục mọi thẻ của 1 từ (theo note.targetWord).
 * Dùng khi đánh dấu "đã biết" (ẩn khỏi hàng đợi ôn, giữ tiến độ) hoặc lưu lại.
 */
export async function setSuspendedByTargetWord(
  userId: string,
  targetWord: string,
  suspended: boolean,
): Promise<number> {
  const noteRows = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.targetWord, targetWord)));
  const ids = noteRows.map((r) => r.id);
  if (ids.length === 0) return 0;
  await db
    .update(cards)
    .set({ suspended })
    .where(and(eq(cards.userId, userId), inArray(cards.noteId, ids)));
  return ids.length;
}

/** Suspend/khôi phục toàn bộ card 1 loại (khi bật/tắt loại thẻ — docs/09 §5). */
export async function setSuspendedByType(
  userId: string,
  types: CardType[],
  suspended: boolean,
): Promise<void> {
  if (types.length === 0) return;
  await db
    .update(cards)
    .set({ suspended })
    .where(and(eq(cards.userId, userId), inArray(cards.type, types)));
}
