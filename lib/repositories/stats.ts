/**
 * Repository: user_stats (XP, streak). SKELETON Phase 1 — lọc userId.
 * addXp / bumpStreak hoàn thiện ở Phase 4 (gamification).
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userStats } from "@/lib/db/schema";
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

export async function bumpStreak(userId: string, today: string): Promise<void> {
  // TODO Phase 4: logic streak theo app_timezone (giữ chữ ký + lọc userId).
  void userId;
  void today;
  throw new Error("bumpStreak chưa triển khai — Phase 4");
}
