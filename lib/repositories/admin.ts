/**
 * Repository admin (chỉ gọi sau requireAdmin — CỐ Ý không lọc user_id).
 */
import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, sources, users } from "@/lib/db/schema";

export async function getGlobalStats(): Promise<{
  totalUsers: number;
  totalSources: number;
  totalCards: number;
  aiThisMonth: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

  const [totalUsers, totalSources, totalCards, aiThisMonth] = await Promise.all([
    count(db.select({ n: sql<number>`count(*)::int` }).from(users)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(sources)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(cards)),
    count(
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(sources)
        .where(gte(sources.createdAt, startOfMonth)),
    ),
  ]);
  return { totalUsers, totalSources, totalCards, aiThisMonth };
}
