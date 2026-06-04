/**
 * lib/config — đọc cấu hình hệ thống từ bảng app_settings (DB), KHÔNG hard-code.
 * Cache in-memory TTL ngắn + fallback DEFAULTS (trùng giá trị seed) nếu key thiếu.
 * Admin sửa setting → gọi invalidate() (Sprint 5). docs/02-architecture §7-8.
 */
import { getAppSetting } from "@/lib/repositories/settings";
import type { SettingValue } from "@/lib/db/types";

/** Giá trị mặc định — NGUỒN SỰ THẬT DUY NHẤT, dùng cho cả seed lẫn fallback. */
export const APP_SETTINGS_DEFAULTS = {
  openai_model: { value: "gpt-4o", type: "string" as const, description: "Model OpenAI cho AI Ingest" },
  whisper_model: { value: "whisper-1", type: "string" as const, description: "Model transcribe (GĐ2)" },
  ingest_chunk_size: { value: 4000, type: "number" as const, description: "Ngưỡng ký tự để chunk văn dài" },
  max_import_chars: { value: 50000, type: "number" as const, description: "Giới hạn ký tự mỗi lần import" },
  default_card_types: { value: ["recognition", "cloze"], type: "json" as const, description: "Loại thẻ bật mặc định cho user mới" },
  tts_provider: { value: "webspeech", type: "string" as const, description: "Nhà cung cấp TTS: webspeech | cloud" },
  feature_flags: { value: {}, type: "json" as const, description: "Cờ bật/tắt tính năng" },
} satisfies Record<string, { value: SettingValue; type: "string" | "number" | "bool" | "json"; description: string }>;

export type ConfigKey = keyof typeof APP_SETTINGS_DEFAULTS;

const TTL_MS = 30_000;
type CacheEntry = { value: SettingValue; at: number };
const cache = new Map<string, CacheEntry>();

/**
 * Đọc giá trị cấu hình. Trả giá trị từ DB (nếu có & còn hạn cache),
 * ngược lại fallback DEFAULTS. Không bao giờ ném khi key hợp lệ.
 */
export async function getConfig<T extends SettingValue = SettingValue>(
  key: ConfigKey,
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.value as T;
  }
  try {
    const row = await getAppSetting(key);
    if (row) {
      cache.set(key, { value: row.value, at: Date.now() });
      return row.value as T;
    }
  } catch {
    // DB chưa sẵn sàng / chưa migrate → dùng fallback.
  }
  return APP_SETTINGS_DEFAULTS[key].value as T;
}

/** Xoá cache (Admin gọi sau khi sửa setting — Sprint 5). */
export function invalidate(key?: ConfigKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}
