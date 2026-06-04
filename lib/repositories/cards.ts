/**
 * Repository: cards. LUÔN lọc userId. getDue hoàn thiện ở Phase 4 (SRS).
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import type { Card } from "@/lib/db/schema";
import type { FsrsState } from "@/lib/db/types";

export type CardType = Card["type"];

/**
 * Lấy thẻ đến hạn của user (fsrs due <= now, chưa suspend). Phase 4 hoàn thiện.
 */
export async function getDue(userId: string): Promise<Card[]> {
  void userId; // TODO Phase 4
  return [];
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
  fsrsState: FsrsState,
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
