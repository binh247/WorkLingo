/**
 * Thuật toán "từ đáng học" (pure, không I/O). docs/08-smart-word-selection.md §2-4.
 * B1 giữ worthLearning; B2 bỏ từ đã biết; B3 xếp theo tần suất; đánh dấu câu i+1.
 */
import type { Token } from "@/lib/db/types";

export type StudySentence = { id: string; tokens: Token[] };

export type SuggestedWord = {
  lemma: string;
  surface: string;
  reading: string;
  meaning_vi: string;
  pos: string;
  freq: number;
  sentenceId: string;
  isPlusOne: boolean;
};

export type SelectionResult = {
  suggestions: SuggestedWord[];
  plusOneSentenceIds: Set<string>;
};

export function selectWorthLearning(params: {
  sentences: StudySentence[];
  knownLemmas: Set<string>;
  freq: Map<string, number>;
  limit: number;
}): SelectionResult {
  const { sentences, knownLemmas, freq, limit } = params;
  const plusOneSentenceIds = new Set<string>();
  const plusOneLemmas = new Set<string>();

  // Xác định câu i+1: đúng 1 token (worthLearning && chưa biết).
  for (const s of sentences) {
    const unknown = s.tokens.filter(
      (t) => t.worthLearning && !knownLemmas.has(t.lemma || t.surface),
    );
    if (unknown.length === 1) {
      plusOneSentenceIds.add(s.id);
      plusOneLemmas.add(unknown[0].lemma || unknown[0].surface);
    }
  }

  // Gom ứng viên theo lemma (giữ câu đầu tiên gặp).
  const byLemma = new Map<string, SuggestedWord>();
  for (const s of sentences) {
    for (const t of s.tokens) {
      const lemma = t.lemma || t.surface;
      if (!t.worthLearning) continue; // B1
      if (knownLemmas.has(lemma)) continue; // B2
      if (byLemma.has(lemma)) continue;
      byLemma.set(lemma, {
        lemma,
        surface: t.surface,
        reading: t.reading,
        meaning_vi: t.meaning_vi,
        pos: t.pos,
        freq: freq.get(lemma) ?? 1,
        sentenceId: s.id,
        isPlusOne: plusOneLemmas.has(lemma),
      });
    }
  }

  // B3: xếp hạng — i+1 trước, rồi tần suất giảm dần.
  const suggestions = [...byLemma.values()]
    .sort((a, b) => {
      if (a.isPlusOne !== b.isPlusOne) return a.isPlusOne ? -1 : 1;
      return b.freq - a.freq;
    })
    .slice(0, limit);

  return { suggestions, plusOneSentenceIds };
}
