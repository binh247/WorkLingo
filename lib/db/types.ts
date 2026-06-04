/**
 * Kiểu dữ liệu dùng chung cho jsonb trong DB.
 * Token = 1 từ do AI Ingest sinh (xem docs/03-data-model.md §2).
 */
export type Token = {
  surface: string; // dạng xuất hiện trong câu (vd 確認)
  reading: string; // furigana (hiragana, vd かくにん)
  lemma: string; // dạng gốc
  pos: string; // loại từ tiếng Việt (vd "danh từ + する")
  meaning_vi: string; // nghĩa tiếng Việt theo ngữ cảnh
  worthLearning: boolean; // AI gợi ý có đáng đào thẻ không
};

/** Trạng thái FSRS (ts-fsrs) lưu trong cards.fsrs_state — chi tiết hoá ở Sprint 4. */
export type FsrsState = Record<string, unknown>;

/** Giá trị cấu hình hệ thống (app_settings.value) — kiểu tuỳ key. */
export type SettingValue = string | number | boolean | string[] | Record<string, unknown>;
