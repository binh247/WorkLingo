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
import {
  deleteSentenceAction,
  explainGrammarAction,
  markWordKnown,
  saveWordAsCards,
} from "./actions";

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
  const [sentenceList, setSentenceList] =
    React.useState<StudySentence[]>(sentences);
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

  function onMarkKnown(lemma: string, surface?: string) {
    setStatus(lemma, "known");
    startTransition(async () => {
      await markWordKnown(lemma, surface);
    });
    setSelected(null);
  }

  function onDeleteSentence(id: string) {
    if (!window.confirm("Xóa hẳn câu này? Không khôi phục được.")) return;
    setSentenceList((prev) => prev.filter((s) => s.id !== id));
    if (selected?.sentenceId === id) setSelected(null);
    startTransition(async () => {
      await deleteSentenceAction(id);
    });
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
        onToggleSkip={(lemma) =>
          onMarkKnown(
            lemma,
            suggestions.find((s) => s.lemma === lemma)?.surface,
          )
        }
      />

      <div className="flex flex-col gap-3">
        {sentenceList.map((s) => (
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
              <div className="flex shrink-0 gap-1">
                <Button3D
                  variant="neutral"
                  size="sm"
                  aria-label="Đọc câu"
                  onClick={() => speakSentence(s.text)}
                >
                  🔊
                </Button3D>
                <Button3D
                  variant="danger"
                  size="sm"
                  aria-label="Xóa câu"
                  disabled={pending}
                  onClick={() => onDeleteSentence(s.id)}
                >
                  🗑
                </Button3D>
              </div>
            </div>
            <GrammarPanel sentenceText={s.text} />
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
            onMarkKnown(
              selected.token.lemma || selected.token.surface,
              selected.token.surface,
            )
          }
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

function GrammarPanel({ sentenceText }: { sentenceText: string }) {
  const [data, setData] = React.useState<{
    summary: string;
    points: string[];
  } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState(false);

  function load() {
    setError(false);
    startTransition(async () => {
      try {
        setData(await explainGrammarAction(sentenceText));
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div className="mt-2">
      {!data && (
        <button
          className="text-sm font-bold text-info-dark underline disabled:opacity-50"
          disabled={pending}
          onClick={load}
        >
          {pending ? "Đang giải thích…" : "📖 Giải thích ngữ pháp"}
        </button>
      )}
      {error && (
        <p className="text-sm font-bold text-danger">Không giải thích được.</p>
      )}
      {data && (
        <div className="mt-1 rounded-xl bg-[#F0F8FF] p-3 text-sm">
          <p className="font-bold text-ink">{data.summary}</p>
          <ul className="mt-1 list-disc pl-5 text-ink">
            {data.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
