/**
 * Repository: cards. SKELETON Phase 1 — chữ ký đầy đủ, LUÔN lọc userId.
 * getDue / saveCard hoàn thiện ở Phase 3-4 (flashcard + SRS).
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import type { Card } from "@/lib/db/schema";

/**
 * Lấy thẻ đến hạn của user (fsrs due <= now, chưa suspend).
 * Phase 1 trả [] — logic FSRS hoàn thiện ở Phase 4 (dùng index cards_due_idx).
 */
export async function getDue(userId: string): Promise<Card[]> {
  void userId; // TODO Phase 4: where userId + suspended=false + fsrs due<=now
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
