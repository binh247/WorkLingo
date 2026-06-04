/**
 * XP theo rating (đọc bảng từ app_settings.xp_per_review). docs/04 §3, QĐ4.
 */
import type { Rating } from "@/lib/srs";

export type XpTable = { again: number; hard: number; good: number; easy: number };

export function xpForRating(rating: Rating, table: XpTable): number {
  switch (rating) {
    case 1:
      return table.again;
    case 2:
      return table.hard;
    case 3:
      return table.good;
    case 4:
      return table.easy;
  }
}
