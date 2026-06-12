/**
 * lib/tts — phát âm. MVP: Web Speech API (miễn phí, client-side).
 * Bọc interface để GĐ sau nâng cloud TTS + cache (docs/02-architecture §2).
 * Nơi gọi (Phase 3) truyền `reading` (kana) thay vì kanji thô để đọc chuẩn.
 *
 * QUAN TRỌNG: phải CHỌN ĐÚNG giọng tiếng Nhật từ getVoices(), nếu không trình
 * duyệt sẽ dùng giọng mặc định (thường tiếng Anh) đọc kana/kanji → sai. Danh
 * sách giọng nạp bất đồng bộ nên lắng nghe 'voiceschanged' để cache lại.
 */
export interface SpeakOptions {
  lang?: string;
  /** Tốc độ đọc (0.1–10). Mặc định 0.95 cho rõ kana. */
  rate?: number;
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voiceCache: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voiceCache = v;
  return voiceCache;
}

// Warm-up: getVoices() thường rỗng ở lần đầu; voiceschanged sẽ bắn khi sẵn sàng.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

// Tên các giọng Nhật chất lượng tốt, ưu tiên theo thứ tự.
const PREFERRED_JA = [
  "Google 日本語",
  "Microsoft Nanami",
  "Microsoft Ayumi",
  "Microsoft Haruka",
  "Kyoko",
  "Otoya",
  "O-ren",
  "Hattori",
];

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const ja = refreshVoices().filter((v) =>
    v.lang?.toLowerCase().startsWith("ja"),
  );
  if (!ja.length) return null;
  for (const name of PREFERRED_JA) {
    const m = ja.find((v) => v.name.includes(name));
    if (m) return m;
  }
  // Ưu tiên giọng cài sẵn trong máy (localService) rồi mới tới giọng đầu tiên.
  return ja.find((v) => v.localService) ?? ja[0];
}

/** Có ít nhất một giọng tiếng Nhật trên máy không? (để UI cảnh báo nếu cần) */
export function hasJapaneseVoice(): boolean {
  return pickJapaneseVoice() !== null;
}

/** Đọc bằng Web Speech API (fallback khi /api/tts lỗi/offline). */
function speakWebSpeech(text: string, opts?: SpeakOptions): void {
  if (!isSupported() || !text.trim()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts?.lang ?? "ja-JP";
  u.rate = opts?.rate ?? 0.95;
  const voice = pickJapaneseVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang; // khớp lang với giọng đã chọn
  } else {
    console.warn(
      "[WorkLingo TTS] Máy chưa có giọng tiếng Nhật — phát âm có thể sai. " +
        "Hãy cài gói giọng tiếng Nhật của hệ điều hành hoặc dùng Chrome.",
    );
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Đọc text (mặc định tiếng Nhật).
 * Ưu tiên Google Translate TTS qua /api/tts (giọng đồng nhất, chuẩn hơn);
 * nếu lỗi/offline → tự fallback về Web Speech.
 */
export function speak(text: string, opts?: SpeakOptions): void {
  if (typeof window === "undefined" || !text.trim()) return;
  cancel();

  let fellBack = false;
  const fallback = () => {
    if (fellBack) return;
    fellBack = true;
    speakWebSpeech(text, opts);
  };

  try {
    const lang = (opts?.lang ?? "ja-JP").slice(0, 2); // "ja"
    const audio = new Audio(
      `/api/tts?lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`,
    );
    audio.playbackRate = opts?.rate ?? 1;
    currentAudio = audio;
    audio.addEventListener("error", fallback, { once: true });
    audio.play().catch(fallback);
  } catch {
    fallback();
  }
}

export function cancel(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (isSupported()) window.speechSynthesis.cancel();
}

/** Đọc một từ theo cách đọc kana (reading) để phát âm chuẩn (docs/04 F8). */
export function speakWord(reading: string): void {
  speak(reading, { lang: "ja-JP" });
}

/** Đọc cả câu nguyên văn. */
export function speakSentence(text: string): void {
  speak(text, { lang: "ja-JP" });
}
