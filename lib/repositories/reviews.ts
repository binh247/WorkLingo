/**
 * Repository: reviews (log mỗi lần ôn). Kiểm card thuộc user trước khi ghi.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, reviews } from "@/lib/db/schema";

export async function insertReview(
  userId: string,
  cardId: string,
  rating: number,
  reviewedAt: Date = new Date(),
): Promise<boolean> {
  const [owned] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .limit(1);
  if (!owned) return false;
  await db.insert(reviews).values({ cardId, rating, reviewedAt });
  return true;
}
