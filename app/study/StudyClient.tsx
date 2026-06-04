"use client";

import * as React from "react";
import { SentenceView } from "@/components/SentenceView";
import { SuggestedWords } from "@/components/SuggestedWords";
import { WordPopup } from "@/components/WordPopup";
import { Button3D } from "@/components/Button3D";
import { speakSentence } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Token } from "@/lib/db/types";
import type { SuggestedWord } from "@/lib/study/word-selection";
import type { WordStatus } from "@/lib/repositories/userWords";
import { markWordKnown, saveWordAsCards } from "./actions";

type StudySentence = {
  id: string;
  text: string;
  confidence: "high" | "medium" | "low";
  tokens: Token[];
};

export function StudyClient({
  sourceTitle,
  sentences,
  suggestions,
  plusOneIds,
  statusEntries,
  enabledCount,
}: {
  sourceTitle: string;
  sentences: StudySentence[];
  suggestions: SuggestedWord[];
  plusOneIds: string[];
  statusEntries: [string, WordStatus][];
  enabledCount: number;
}) {
  const [statusMap, setStatusMap] = React.useState<Map<string, WordStatus>>(
    () => new Map(statusEntries),
  );
  const plusOne = React.useMemo(() => new Set(plusOneIds), [plusOneIds]);
  const [selected, setSelected] = React.useState<{
    token: Token;
    sentenceId: string;
  } | null>(null);
  const [pending, startTransition] = React.useTransition();

  function setStatus(lemma: string, status: WordStatus) {
    setStatusMap((prev) => new Map(prev).set(lemma, status));
  }

  function onSave() {
    if (!selected) return;
    const { token, sentenceId } = selected;
    setStatus(token.lemma || token.surface, "learning");
    startTransition(async () => {
      await saveWordAsCards({
        sentenceId,
        surface: token.surface,
        reading: token.reading,
        lemma: token.lemma || token.surface,
        meaning_vi: token.meaning_vi,
      });
    });
    setSelected(null);
  }

  function onMarkKnown(lemma: string) {
    setStatus(lemma, "known");
    startTransition(async () => {
      await markWordKnown(lemma);
    });
    setSelected(null);
  }

  function onSaveAll(lemmas: string[]) {
    const byLemma = new Map(suggestions.map((s) => [s.lemma, s]));
    startTransition(async () => {
      for (const lemma of lemmas) {
        const s = byLemma.get(lemma);
        if (!s) continue;
        setStatus(lemma, "learning");
        await saveWordAsCards({
          sentenceId: s.sentenceId,
          surface: s.surface,
          reading: s.reading,
          lemma: s.lemma,
          meaning_vi: s.meaning_vi,
        });
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <header>
        <h1 className="text-2xl font-black text-ink">{sourceTitle}</h1>
        <p className="mt-1 font-bold text-ink-muted">
          Bấm vào từ để xem nghĩa &amp; lưu thành thẻ.
        </p>
      </header>

      <SuggestedWords
        suggestions={suggestions}
        statusMap={statusMap}
        enabledCount={enabledCount}
        saving={pending}
        onSaveAll={onSaveAll}
        onToggleSkip={(lemma) => onMarkKnown(lemma)}
      />

      <div className="flex flex-col gap-3">
        {sentences.map((s) => (
          <div
            key={s.id}
            className={cn(
              "wl-card p-4",
              plusOne.has(s.id) && "border-xp bg-[#FFFBEB]",
            )}
          >
            {plusOne.has(s.id) && (
              <span className="wl-badge mb-1 bg-xp/30 text-ink">i+1</span>
            )}
            <div className="flex items-start justify-between gap-2">
              <SentenceView
                tokens={s.tokens}
                statusMap={statusMap}
                onWordClick={(token) =>
                  setSelected({ token, sentenceId: s.id })
                }
              />
              <Button3D
                variant="neutral"
                size="sm"
                aria-label="Đọc câu"
                onClick={() => speakSentence(s.text)}
              >
                🔊
              </Button3D>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <WordPopup
          token={selected.token}
          status={statusMap.get(selected.token.lemma || selected.token.surface)}
          saving={pending}
          onSave={onSave}
          onMarkKnown={() =>
            onMarkKnown(selected.token.lemma || selected.token.surface)
          }
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
