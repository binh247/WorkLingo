/**
 * Repository: user_stats (XP, streak). SKELETON Phase 1 — lọc userId.
 * addXp / bumpStreak hoàn thiện ở Phase 4 (gamification).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, userStats } from "@/lib/db/schema";
import type { UserStatsRow } from "@/lib/db/schema";

const DEFAULT_STATS = (userId: string): UserStatsRow => ({
  userId,
  xp: 0,
  streak: 0,
  lastStudiedDate: null,
});

/** Trả stats của user; nếu chưa có dòng → trả default (không throw). */
export async function getStats(userId: string): Promise<UserStatsRow> {
  const rows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);
  return rows[0] ?? DEFAULT_STATS(userId);
}

export async function addXp(userId: string, amount: number): Promise<void> {
  await db
    .insert(userStats)
    .values({ userId, xp: amount })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { xp: sql`${userStats.xp} + ${amount}` },
    });
}

/** Ngày local (YYYY-MM-DD) theo timezone cấu hình. */
export function localDateStr(now: Date, timeZone: string): string {
  // en-CA cho định dạng YYYY-MM-DD ổn định.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db_ = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db_ - da) / 86400000);
}

/**
 * Ghi nhận ngày học → cập nhật streak theo timezone (docs/04 F4, QĐ5).
 * cùng ngày: giữ; hôm qua: +1; cách ≥2 ngày hoặc lần đầu: reset = 1.
 * Trả streak mới.
 */
export async function recordStudyDay(
  userId: string,
  now: Date,
  timeZone: string,
): Promise<number> {
  const today = localDateStr(now, timeZone);
  const cur = await getStats(userId);
  let streak = 1;
  if (cur.lastStudiedDate) {
    const diff = daysBetween(cur.lastStudiedDate, today);
    if (diff === 0) streak = cur.streak; // cùng ngày
    else if (diff === 1) streak = cur.streak + 1; // hôm qua
    else streak = 1; // reset
  }
  await db
    .insert(userStats)
    .values({ userId, streak, lastStudiedDate: today })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { streak, lastStudiedDate: today },
    });
  return streak;
}

/** Số liệu Dashboard (docs/04 F5). dueToday tính theo cuối ngày local (timezone). */
export async function getDashboard(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<{ streak: number; xp: number; dueToday: number; totalCards: number }> {
  const stats = await getStats(userId);

  // Cuối ngày hôm nay theo timezone → ISO để so với fsrs_state->>'due'.
  const todayStr = localDateStr(now, timeZone); // YYYY-MM-DD
  const endOfToday = new Date(`${todayStr}T23:59:59`).toISOString();
  const dueExpr = sql`(${cards.fsrsState} ->> 'due')`;

  const dueRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.suspended, false),
        sql`${dueExpr} <= ${endOfToday}`,
      ),
    );
  const totalRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.userId, userId));

  return {
    streak: stats.streak,
    xp: stats.xp,
    dueToday: dueRows[0]?.n ?? 0,
    totalCards: totalRows[0]?.n ?? 0,
  };
}

/** Bảng xếp hạng XP (top N) — GĐ3 social. */
export async function leaderboard(
  limit = 10,
): Promise<{ name: string | null; xp: number }[]> {
  const { users } = await import("@/lib/db/schema");
  const rows = await db
    .select({ name: users.name, xp: userStats.xp })
    .from(userStats)
    .innerJoin(users, eq(users.id, userStats.userId))
    .orderBy(sql`${userStats.xp} desc`)
    .limit(limit);
  return rows;
}

/** Heatmap: số review mỗi ngày trong `days` ngày gần nhất. */
export async function reviewHeatmap(
  userId: string,
  days = 84,
): Promise<{ day: string; count: number }[]> {
  const { reviews, cards } = await import("@/lib/db/schema");
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${reviews.reviewedAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(and(eq(cards.userId, userId), sql`${reviews.reviewedAt} >= ${since.toISOString()}`))
    .groupBy(sql`to_char(${reviews.reviewedAt}, 'YYYY-MM-DD')`);
  return rows;
}
