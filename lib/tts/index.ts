/**
 * lib/tts — phát âm. MVP: Web Speech API (miễn phí, client-side).
 * Bọc interface để GĐ sau nâng cloud TTS + cache (docs/02-architecture §2).
 * Nơi gọi (Phase 3) truyền `reading` (kana) thay vì kanji thô để đọc chuẩn.
 */
export interface SpeakOptions {
  lang?: string;
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Đọc text (mặc định tiếng Nhật). No-op nếu server hoặc trình duyệt không hỗ trợ. */
export function speak(text: string, opts?: SpeakOptions): void {
  if (!isSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts?.lang ?? "ja-JP";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function cancel(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}
