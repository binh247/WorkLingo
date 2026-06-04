/**
 * Gamification GĐ3 (pure): level từ XP, hearts. docs/04 Gamification.
 */

/** Level: mỗi level cần XP tăng dần. Level n cần n*100 XP tích luỹ (đơn giản, dễ hiểu). */
export function levelFromXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
} {
  let level = 1;
  let remaining = Math.max(0, xp);
  let need = 100;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = level * 100;
  }
  return { level, xpIntoLevel: remaining, xpForNext: need };
}

/** Hearts: tối đa 5; mỗi lần sai (Again) trừ 1; hồi 1 mỗi MỘT giờ. */
export const MAX_HEARTS = 5;
export function heartsAfter(
  current: number,
  lostAgain: number,
  hoursElapsed: number,
): number {
  const regen = Math.floor(hoursElapsed);
  return Math.max(0, Math.min(MAX_HEARTS, current - lostAgain + regen));
}
