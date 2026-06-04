/**
 * lib/srs — bọc ts-fsrs (chuẩn SRS). Chỉ file này import ts-fsrs (chống lock-in).
 * fsrs_state lưu jsonb (due/last_review thành ISO string) → revive khi tính.
 */
import {
  createEmptyCard,
  fsrs,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

/** 1=Again, 2=Hard, 3=Good, 4=Easy (khớp reviews.rating). */
export type Rating = 1 | 2 | 3 | 4;
/** Trạng thái FSRS lưu trong cards.fsrs_state (jsonb). */
export type FsrsState = FsrsCard;

const scheduler = fsrs();

/** State ban đầu cho thẻ mới (due = now). */
export function newCardState(now: Date = new Date()): FsrsState {
  return createEmptyCard(now);
}
/** Alias tương thích Phase 3. */
export const createEmptyState = newCardState;

/** Revive due/last_review từ string (jsonb) về Date trước khi đưa vào ts-fsrs. */
function revive(state: FsrsState): FsrsCard {
  return {
    ...state,
    due: new Date(state.due),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  } as FsrsCard;
}

/** Chấm 1 lượt → state mới + due mới. */
export function schedule(
  state: FsrsState,
  rating: Rating,
  now: Date = new Date(),
): { state: FsrsState; due: Date } {
  const { card } = scheduler.next(revive(state), now, rating as Grade);
  return { state: card, due: new Date(card.due) };
}

/** 4 due dự kiến cho 4 nút (hiện nhãn khoảng thời gian). */
export function previewIntervals(
  state: FsrsState,
  now: Date = new Date(),
): Record<Rating, Date> {
  const rec = scheduler.repeat(revive(state), now);
  return {
    1: new Date(rec[1].card.due),
    2: new Date(rec[2].card.due),
    3: new Date(rec[3].card.due),
    4: new Date(rec[4].card.due),
  };
}

/** Thẻ đã đến hạn chưa? */
export function isDue(state: FsrsState, now: Date = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}
