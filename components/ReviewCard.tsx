"use client";

import * as React from "react";
import { Button3D } from "@/components/Button3D";
import { speakSentence, speakWord } from "@/lib/tts";
import { makeCloze } from "@/lib/srs/cloze";
import type { Rating } from "@/lib/srs";

export type ReviewItem = {
  cardId: string;
  type: "recognition" | "cloze" | "production" | "reading";
  targetWord: string;
  reading: string;
  meaning: string;
  sentenceText: string;
};

const RATINGS: { r: Rating; label: string; variant: "danger" | "neutral" | "primary" | "info" }[] =
  [
    { r: 1, label: "Again", variant: "danger" },
    { r: 2, label: "Hard", variant: "neutral" },
    { r: 3, label: "Good", variant: "primary" },
    { r: 4, label: "Easy", variant: "info" },
  ];

/** Mặt trước/sau theo loại thẻ (docs/09 §2). */
export function ReviewCard({
  item,
  onRate,
}: {
  item: ReviewItem;
  onRate: (rating: Rating) => void;
}) {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => setRevealed(false), [item.cardId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        onRate(Number(e.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onRate]);

  const front = renderFront(item);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8">
      <div className="wl-card flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="font-jp text-2xl font-black text-ink">{front.main}</div>
        {front.sub && (
          <div className="font-jp text-base text-ink-muted">{front.sub}</div>
        )}

        {revealed && (
          <div className="bounce-in mt-2 flex flex-col items-center gap-1 border-t-2 border-[#EEE] pt-3">
            <div className="font-jp text-xl font-extrabold text-brand-dark">
              {item.targetWord}
              <span className="ml-2 text-sm text-ink-muted">
                {item.reading}
              </span>
            </div>
            <div className="font-bold text-ink">{item.meaning}</div>
            <button
              className="wl-chip mt-1"
              onClick={() => speakWord(item.reading || item.targetWord)}
            >
              🔊 Phát âm
            </button>
          </div>
        )}
      </div>

      {!revealed ? (
        <Button3D
          variant="info"
          className="w-full"
          onClick={() => setRevealed(true)}
        >
          Hiện đáp án (Space)
        </Button3D>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((b) => (
            <Button3D key={b.r} variant={b.variant} onClick={() => onRate(b.r)}>
              {b.label}
              <span className="ml-1 text-xs opacity-70">{b.r}</span>
            </Button3D>
          ))}
        </div>
      )}

      <button
        className="self-center text-sm font-bold text-ink-muted underline"
        onClick={() => speakSentence(item.sentenceText)}
      >
        🔊 Đọc câu ngữ cảnh
      </button>
    </div>
  );
}

function renderFront(item: ReviewItem): { main: string; sub?: string } {
  switch (item.type) {
    case "recognition":
      return { main: item.targetWord, sub: item.sentenceText };
    case "cloze":
      return { main: makeCloze(item.sentenceText, item.targetWord).text };
    case "production":
      return { main: item.meaning, sub: "(Nhớ lại từ tiếng Nhật)" };
    case "reading":
      return { main: item.targetWord };
  }
}

export default ReviewCard;
