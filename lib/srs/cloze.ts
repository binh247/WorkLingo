/**
 * Khoét từ đích trong câu cho thẻ cloze (pure). docs/09 §2.
 */
const BLANK = "＿＿＿";

export function makeCloze(
  sentenceText: string,
  surface: string,
): { text: string; ok: boolean } {
  if (surface && sentenceText.includes(surface)) {
    return { text: sentenceText.replace(surface, BLANK), ok: true };
  }
  return { text: sentenceText, ok: false };
}
