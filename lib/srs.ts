/**
 * lib/srs — wrap ts-fsrs (chuẩn SRS hiện đại). SKELETON Phase 1 (chưa nối DB).
 * Nối repository/reviews ở Phase 4. docs/03-data-model reviews.rating: 1..4.
 */
import {
  createEmptyCard,
  fsrs,
  type Card as FsrsCard,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";

/** 1=Again, 2=Hard, 3=Good, 4=Easy (khớp reviews.rating). */
export type Rating = 1 | 2 | 3 | 4;

const scheduler = fsrs();

/** Trạng thái FSRS ban đầu cho một thẻ mới. */
export function createEmptyState(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

/** Chấm điểm 1 lượt ôn → trả trạng thái mới + log. */
export function schedule(
  state: FsrsCard,
  rating: Rating,
  now: Date = new Date(),
): RecordLogItem {
  return scheduler.next(state, now, rating as Grade);
}

/** Thẻ đã đến hạn chưa? */
export function isDue(state: FsrsCard, now: Date = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}
