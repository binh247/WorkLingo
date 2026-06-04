"use server";

import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { applyReview } from "@/lib/repositories/cards";
import { addXp, recordStudyDay } from "@/lib/repositories/stats";
import { xpForRating, type XpTable } from "@/lib/srs/xp";
import type { Rating } from "@/lib/srs";

export type ReviewResult = {
  ok: boolean;
  xpGained: number;
  streak: number;
};

/** Chấm 1 thẻ: ghi review + fsrs_state + XP + streak. docs/04 F4, QĐ6. */
export async function submitReview(
  cardId: string,
  rating: Rating,
): Promise<ReviewResult> {
  const user = await requireUser();
  if (![1, 2, 3, 4].includes(rating)) {
    throw new Error("Rating không hợp lệ");
  }

  const now = new Date();
  await applyReview(user.id, cardId, rating, now);

  const xpTable = await getConfig<XpTable>("xp_per_review");
  const tz = await getConfig<string>("app_timezone");
  const xpGained = xpForRating(rating, xpTable);
  if (xpGained > 0) await addXp(user.id, xpGained);
  const streak = await recordStudyDay(user.id, now, tz);

  return { ok: true, xpGained, streak };
}
