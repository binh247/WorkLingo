/**
 * Repository: user_words (vốn từ cho thuật toán i+1). Luôn lọc/ghi theo user_id.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userWords } from "@/lib/db/schema";

export type WordStatus = "new" | "learning" | "known";

export async function getStatusMap(
  userId: string,
): Promise<Map<string, WordStatus>> {
  const rows = await db
    .select({ word: userWords.word, status: userWords.status })
    .from(userWords)
    .where(eq(userWords.userId, userId));
  return new Map(rows.map((r) => [r.word, r.status as WordStatus]));
}

export async function getKnownLemmas(userId: string): Promise<Set<string>> {
  const map = await getStatusMap(userId);
  const set = new Set<string>();
  for (const [w, s] of map) if (s === "known") set.add(w);
  return set;
}

export async function upsertStatus(
  userId: string,
  word: string,
  status: WordStatus,
): Promise<void> {
  await db
    .insert(userWords)
    .values({ userId, word, status })
    .onConflictDoUpdate({
      target: [userWords.userId, userWords.word],
      set: { status },
    });
}

export const markKnown = (userId: string, word: string) =>
  upsertStatus(userId, word, "known");
export const markLearning = (userId: string, word: string) =>
  upsertStatus(userId, word, "learning");
