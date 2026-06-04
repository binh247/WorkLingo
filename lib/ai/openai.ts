/**
 * Khởi tạo client OpenAI (server-side). Phase 1 KHÔNG gọi API.
 * API key đọc từ env; gọi thật ở Phase 2 (Ingest) / GĐ2 (Whisper).
 */
import OpenAI from "openai";

let _client: OpenAI | null = null;

/** Lazy: chỉ tạo client khi thực sự cần (Phase 2+), tránh lỗi thiếu key ở build. */
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}
